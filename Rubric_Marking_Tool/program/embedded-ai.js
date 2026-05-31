// Regular script (NOT type="module") — works from file:// pages.
//
// Chrome blocks <script type="module" src="..."> from file:// pages silently.
// Solution: fetch() Transformers.js from CDN (browser fetch, not blocked),
// wrap it in a Blob URL, and import() that — blob: URLs are same-origin
// so dynamic import always works regardless of file:// restrictions.
//
// Exposes window.embeddedAi for app.js.

(function () {
  'use strict';

  const MODEL_ID  = 'onnx-community/Qwen2.5-1.5B-Instruct';
  const CDN_BASE  = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3/dist/';
  const LIB_URL   = CDN_BASE + 'transformers.min.js';
  const IDB_NAME  = 'rubric-marking-ai';
  const IDB_STORE = 'kv';

  let _generator = null;
  let _state     = 'idle';
  let _fileCache = new Map();
  let _lib       = null; // cached Transformers.js module reference

  // ── Library loader ────────────────────────────────────────────────────────
  // fetch() to HTTPS CDN is a normal browser request — not blocked at work.
  // import(blobUrl) bypasses file:// module restrictions entirely.

  async function loadLib() {
    if (_lib) return _lib;

    const resp = await fetch(LIB_URL);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    const blob   = new Blob([await resp.text()], { type: 'application/javascript' });
    const blobUrl = URL.createObjectURL(blob);
    try {
      _lib = await import(blobUrl);
    } finally {
      URL.revokeObjectURL(blobUrl);
    }
    return _lib;
  }

  // ── IndexedDB helpers ─────────────────────────────────────────────────────

  function openIdb() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror   = () => reject(req.error);
    });
  }

  async function idbGet(key) {
    const db = await openIdb();
    return new Promise((res) => {
      const req = db.transaction(IDB_STORE, 'readonly').objectStore(IDB_STORE).get(key);
      req.onsuccess = () => res(req.result ?? null);
      req.onerror   = () => res(null);
    });
  }

  async function idbSet(key, value) {
    const db = await openIdb();
    return new Promise((res, rej) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(value, key);
      tx.oncomplete = res;
      tx.onerror    = () => rej(tx.error);
    });
  }

  async function idbDel(key) {
    const db = await openIdb();
    return new Promise((res) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).delete(key);
      tx.oncomplete = res;
      tx.onerror    = res;
    });
  }

  // ── Device detection ──────────────────────────────────────────────────────

  async function preferredDevice() {
    try {
      if (navigator.gpu) {
        const adapter = await navigator.gpu.requestAdapter();
        if (adapter) return 'webgpu';
      }
    } catch (_) {}
    return 'wasm';
  }

  // ── Cache interception ────────────────────────────────────────────────────
  // Patches caches.open() before pipeline() runs so every file Transformers.js
  // writes to the Cache API is captured with its exact cache-key URL.

  let _origCachesOpen = null;

  function interceptCacheWrites() {
    const tracked   = new Map();
    _origCachesOpen = caches.open.bind(caches);

    caches.open = async (name) => {
      const cache   = await _origCachesOpen(name);
      const origPut = cache.put.bind(cache);
      cache.put = async (req, resp) => {
        const url = typeof req === 'string' ? req : req.url;
        if (!tracked.has(url)) {
          tracked.set(url, {
            response:    resp.clone(),
            contentType: resp.headers.get('content-type') || '',
            cacheName:   name,
          });
        }
        return origPut(req, resp);
      };
      return cache;
    };

    return tracked;
  }

  function stopIntercepting() {
    if (_origCachesOpen) { caches.open = _origCachesOpen; _origCachesOpen = null; }
  }

  function relPathFromUrl(url) {
    const hf = url.match(/\/resolve\/[^/]+\/(.+?)(\?.*)?$/);
    if (hf) return hf[1];
    const onnx = url.match(/\bonnx\b.+/);
    if (onnx) return onnx[0];
    return new URL(url).pathname.split('/').pop();
  }

  // ── Project folder: save / restore ───────────────────────────────────────

  async function hasSavedFolder() {
    return !!(await idbGet('models-dir'));
  }

  async function getStoredDir() {
    try {
      const h = await idbGet('models-dir');
      if (!h) return null;
      const p = await h.queryPermission({ mode: 'readwrite' });
      if (p === 'granted') return h;
      return (await h.requestPermission({ mode: 'readwrite' })) === 'granted' ? h : null;
    } catch { return null; }
  }

  async function restoreFromFolder(dir, onStatus) {
    let manifest;
    try {
      const mh = await dir.getFileHandle('manifest.json');
      manifest  = JSON.parse(await (await mh.getFile()).text());
    } catch {
      // Manifest missing — folder was cleared or deleted; drop the stale reference
      await idbDel('models-dir');
      return false;
    }

    const files = manifest.files || [];
    const cache = await caches.open(manifest.cacheName || 'transformers-cache');

    for (let i = 0; i < files.length; i++) {
      const { relPath, url, contentType } = files[i];
      if (await cache.match(url)) continue;

      onStatus('loading', Math.round((i / files.length) * 80), `Restoring ${relPath.split('/').pop()}…`);

      try {
        const parts = relPath.split('/').filter(Boolean);
        let d = dir;
        for (let p = 0; p < parts.length - 1; p++) d = await d.getDirectoryHandle(parts[p]);
        const fh   = await d.getFileHandle(parts.at(-1));
        const file = await fh.getFile();
        await cache.put(url, new Response(file, {
          status: 200,
          headers: { 'Content-Type': contentType || 'application/octet-stream' },
        }));
      } catch (e) { console.warn('Restore failed:', relPath, e); }
    }

    return true;
  }

  // ── Load model (main entry point) ─────────────────────────────────────────

  async function loadModel(onStatus) {
    if (_state === 'ready')   { onStatus('ready', 100, 'Ready'); return; }
    if (_state === 'loading') return;
    _state = 'loading';

    // Prefer project folder if one has been saved
    const dir = await getStoredDir();
    if (dir) {
      onStatus('loading', 0, 'Checking project folder…');
      const restored = await restoreFromFolder(dir, onStatus);
      if (restored) {
        onStatus('loading', 85, 'Files restored — starting model…');
      } else {
        // Folder was empty/deleted — hide the stale note and download fresh
        var staleNote = document.querySelector('#embAiFolderNote');
        var staleBtn  = document.querySelector('#forgetSavedFolder');
        if (staleNote) staleNote.hidden = true;
        if (staleBtn)  staleBtn.hidden  = true;
        onStatus('loading', 0, 'Saved folder is empty — downloading fresh copy…');
      }
    }

    // Load the library via CDN → blob URL → import()
    onStatus('loading', 0, 'Loading AI library from CDN…');
    let pipeline, env;
    try {
      ({ pipeline, env } = await loadLib());
    } catch (e) {
      _state = 'error';
      onStatus('error', 0, `Could not load AI library: ${e.message}. Check internet connection.`);
      return;
    }

    env.backends.onnx.wasm.wasmPaths = CDN_BASE;
    env.useBrowserCache  = true;
    env.allowLocalModels = false;

    const device = await preferredDevice();
    const dtype  = 'q4'; // q4 is the most universally available quantisation
    onStatus('loading', 1, `Starting model (${device.toUpperCase()})…`);

    const tracked = interceptCacheWrites();
    try {
      _generator = await pipeline('text-generation', MODEL_ID, {
        dtype,
        device,
        progress_callback: (p) => {
          if (p.status === 'progress') {
            const pct = Math.round(p.progress || 0);
            onStatus('loading', pct, p.file ? `${p.file} — ${pct}%` : `${pct}%`);
          }
        },
      });
      if (tracked.size > 0) _fileCache = tracked;
      _state = 'ready';
      onStatus('ready', 100, `Ready (${device.toUpperCase()})`);
    } catch (e) {
      _state = 'error';
      _generator = null;
      console.error('[EmbeddedAI] Model load failed:', e);
      var raw = (e && e.message) ? e.message : String(e);
      // Numeric-only messages are ONNX Runtime internal codes — translate the common ones
      var msg = raw;
      if (/^\d+$/.test(raw.trim())) {
        msg = 'ONNX Runtime error ' + raw + '. ' +
          'This usually means the model is too large for available memory on the WASM backend. ' +
          'Try closing other browser tabs to free RAM, then click Load Model again. ' +
          'If this machine has a dedicated GPU, WebGPU (shown in the console) would solve this.';
      }
      console.error('[EmbeddedAI] Device attempted:', device, '| dtype:', dtype);
      onStatus('error', 0, msg);
    } finally {
      stopIntercepting();
    }
  }

  // ── Save model files to project folder ───────────────────────────────────

  async function saveToFolder(onStatus) {
    if (_state !== 'ready') throw new Error('Load the model first');

    let files = _fileCache.size > 0 ? [..._fileCache.entries()] : [];

    if (!files.length) {
      onStatus('searching', 0, 'Scanning browser cache…');
      for (const name of await caches.keys()) {
        const cache = await caches.open(name);
        for (const req of await cache.keys()) {
          if (/huggingface|hf\.co/i.test(req.url)) {
            const response = await cache.match(req);
            if (response) {
              files.push([req.url, {
                response,
                contentType: response.headers.get('content-type') || '',
                cacheName:   name,
              }]);
            }
          }
        }
        if (files.length) break;
      }
    }

    if (!files.length) {
      throw new Error(
        'No model files found in the browser cache.\n' +
        'Load the model then click Save to Folder straight away.'
      );
    }

    // Show guidance before the picker opens so the user knows what to do
    onStatus('saving', 0,
      'A folder picker is about to open.\n' +
      'Choose any folder — for example, create a "models" folder inside your\n' +
      'Rubric_Marking_Tool folder. The location will be remembered so you\n' +
      'only need to pick once.'
    );
    await new Promise((r) => setTimeout(r, 200)); // let the UI update render

    let dirHandle;
    try {
      dirHandle = await window.showDirectoryPicker({ id: 'rubric-models', mode: 'readwrite' });
    } catch (e) {
      if (e.name === 'AbortError') {
        onStatus('ready', 100, 'Save cancelled');
        return;
      }
      throw e;
    }

    const cacheName = files[0][1].cacheName || 'transformers-cache';
    const manifest  = { modelId: MODEL_ID, cacheName, files: [] };

    for (let i = 0; i < files.length; i++) {
      const [url, { response, contentType }] = files[i];
      const relPath = relPathFromUrl(url);
      onStatus('saving', Math.round((i / files.length) * 100), `Saving ${relPath.split('/').pop()}…`);

      try {
        const parts = relPath.split('/').filter(Boolean);
        let d = dirHandle;
        for (let p = 0; p < parts.length - 1; p++) d = await d.getDirectoryHandle(parts[p], { create: true });
        const fh = await d.getFileHandle(parts.at(-1), { create: true });
        const w  = await fh.createWritable();
        await w.write(await response.arrayBuffer());
        await w.close();
        manifest.files.push({ relPath, url, contentType });
      } catch (e) { console.warn('Save failed:', relPath, e); }
    }

    const mh = await dirHandle.getFileHandle('manifest.json', { create: true });
    const mw = await mh.createWritable();
    await mw.write(JSON.stringify(manifest, null, 2));
    await mw.close();

    await idbSet('models-dir', dirHandle);
    onStatus('saved', 100, `Saved to "${dirHandle.name}" (${manifest.files.length} files) — location remembered`);
  }

  async function forgetSavedFolder() { await idbDel('models-dir'); }

  // ── Generate ──────────────────────────────────────────────────────────────

  async function generate(prompt) {
    if (!_generator) throw new Error('Model not loaded');
    const output = await _generator(
      [
        { role: 'system', content: "You write clear, specific Australian high school science feedback. Follow the user's constraints exactly." },
        { role: 'user', content: prompt },
      ],
      {
      max_new_tokens:        450,
      temperature:           0.6,
      top_p:                 0.9,
      do_sample:             true,
      repetition_penalty:    1.3,  // prevents the small model looping on phrases
      no_repeat_ngram_size:  4,    // blocks exact n-gram repeats as a second guard
    }
    );
    const gen = output[0]?.generated_text;
    if (Array.isArray(gen)) return gen.at(-1)?.content || '';
    return String(gen || '');
  }

  // ── Startup ───────────────────────────────────────────────────────────────
  // Verify the manifest actually exists before showing the folder note.
  // If the folder was deleted or cleared, drop the stale IDB reference silently.

  (async function () {
    var note      = document.querySelector('#embAiFolderNote');
    var forgetBtn = document.querySelector('#forgetSavedFolder');
    var dir = await getStoredDir();
    if (!dir) return;
    try {
      await dir.getFileHandle('manifest.json'); // throws if missing
      if (note) {
        note.textContent = 'Model is saved in your project folder — no re-download needed.';
        note.hidden = false;
      }
      if (forgetBtn) forgetBtn.hidden = false;
    } catch {
      await idbDel('models-dir'); // stale reference — clear it
    }
  }());

  window.embeddedAi = {
    get state()    { return _state; },
    hasSavedFolder,
    loadModel,
    saveToFolder,
    forgetSavedFolder,
    generate,
  };

}());
