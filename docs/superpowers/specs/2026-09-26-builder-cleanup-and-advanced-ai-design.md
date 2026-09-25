# Builder cleanup, standard AI removal, and Advanced Marking Tool — design

Date: 2026-09-26
Status: approved in brainstorming, awaiting spec review

## Goals

1. **Rubric Builder** is only about creating and exporting rubrics.
2. **Rubric Marking Tool** (standard) stays the comprehensive package, minus the local-AI panel that almost nobody uses. Staff edit the rule-based comment or copy the AI prompt into the school's Copilot.
3. **Advanced Marking Tool** is a separate, opt-in add-on with a built-in local model (Gemma 4 E2B via llama.cpp), a custom-endpoint option, and copy-prompt. It is standalone: no installers, no admin rights, no pre-installed Python.
4. Colleagues get a small GitHub release zip containing only the Builder and standard Marking Tool.

## Non-goals

- GPU (Vulkan/CUDA) builds of llama.cpp.
- Sharing saved sessions between the standard (`file://`) and Advanced (`http://127.0.0.1`) tools. Browser storage is per-origin; the existing Export/Import JSON buttons bridge them if ever needed.
- Automating releases with GitHub Actions.
- CSV/Excel → dataset converter (see Future work).

---

## Part A — Rubric Builder cleanup

**Keep:** outcome library (subject, stage, search, skills/content filter), Assignment title, Design Rubric view, Export Simple / Ranged Canvas CSV (and its Save As / Download / Copy panel), Clear, Save Plan / Load Plan, Print.

**Remove:**
- `index.html`: Student and Tone fields, the tab bar, `#markView`, `#commentView`.
- `app.js`: marking list rendering, overall grade, `exportMarks`, comment generation (`generateComment`, `sentenceFromDescriptor`, `removeGradeLanguage`, `markedCriteria`), all AI functions, their element refs and event listeners, and any state that only they use (e.g. `state.marks`), plus now-unused helpers.
- `styles.css`: rules only used by removed elements.

**Compatibility:** plans saved before the change still load; unknown fields (marks, comment, AI settings) are ignored.

**README:** rewrite for the Builder (it is currently a copy of the marking tool's README).

## Part A — Standard Marking Tool changes

- Remove the "Generate with Local AI" button, the "Server settings" `<details>` (endpoint + model fields), `generateWithLocalAi`, `setAiStatus` usage tied to it, `els.aiEndpoint` / `els.aiModel`, and `aiEndpoint`/`aiModel` in the session payload. Old sessions containing those fields still load.
- Keep: Copy AI Prompt, rule-based comment, Regenerate. Status/help text becomes along the lines of "Copy the prompt and paste it into Copilot or any AI tool."
- Delete dead files `embedded-ai.js` and `transformers.min.js`.
- **Add-on hooks** (no visible effect in the standard tool):
  - an empty `<div id="aiSlot"></div>` inside `.comment-tools`;
  - `buildAiPrompt` and a comment-output setter remain reachable from a separate classic script (top-level functions in `app.js` are already globals; keep it that way and document it as the add-on contract).
- README: remove the local-AI section, describe Copy AI Prompt.

## Part A — Release packaging

`make_release.bat` at the repo root:
- Regenerates `datasets/_all.js` for both tools.
- Zips `Rubric_Builder/` and `Rubric_Marking_Tool/` into `release/marking-tools-<version>.zip` using built-in `tar.exe`, where `<version>` is passed as an argument (e.g. `make_release.bat v1.0`).
- Excludes `Rubric_Marking_Tool_Advanced/`, `original rubrics/`, `models/`, `.claude/`, `docs/`.
- `release/` is gitignored. The user uploads the zip to a GitHub release manually.

---

## Part B — Advanced Marking Tool

### Folder layout

```
Rubric_Marking_Tool_Advanced/
  Open Advanced Marking Tool.bat   ← rebuilds datasets, starts server, opens browser
  setup.bat                        ← downloads/updates Python, llama.cpp, model
  server.py                        ← Python standard library only
  config.json                      ← ports, model path, context size, threads
  web/advanced-ai.js
  web/advanced-ai.css
  tests/                           ← unittest suite + fake llama-server
  bin/     (gitignored)            ← python/ (embeddable), llama.cpp/ (+ VERSION)
  logs/    (gitignored)            ← llama-server.log
  models/  (gitignored)            ← Gemma 4 E2B instruct GGUF (Q4)
  README.md
```

The add-on depends on `../Rubric_Marking_Tool/program/` sitting beside it (same repo).

### `config.json` (defaults)

```json
{
  "ui_port": 8765,
  "model_port": 8766,
  "model_path": "",
  "context_size": 4096,
  "threads": 0
}
```

- `model_path` empty → use the GGUF in `models/`. Non-empty → use that file (e.g. a copy Unsloth's app already downloaded) and setup skips the model download.
- `threads` 0 → let llama.cpp choose.
- Ports avoid 8080 so tele_ai or a manual llama-server can run alongside.

### `server.py`

`ThreadingHTTPServer` bound to `127.0.0.1:<ui_port>` only.

| Route | Behaviour |
|---|---|
| `GET /` , `GET /<path>` | Static files from `../Rubric_Marking_Tool/program/`. Paths are resolved and must stay inside that directory (no traversal). |
| `GET /index.html` (and `/`) | Same file, with `<link rel="stylesheet" href="/advanced/advanced-ai.css">` injected before `</head>` and `<script src="/advanced/advanced-ai.js"></script>` injected before `</body>`. Nothing on disk is modified. |
| `GET /advanced/<file>` | Static files from `web/`. |
| `GET /api/model/status` | `{state: "stopped"|"starting"|"ready"|"error", model: "<gguf filename>", error: "<message or null>"}` |
| `POST /api/model/start` | Validates `bin/llama.cpp/llama-server.exe` and the GGUF exist (error names the expected path). Spawns `llama-server.exe -m <gguf> --host 127.0.0.1 --port <model_port> -c <context_size> [-t <threads>]`, stdout/stderr to `logs/llama-server.log`. Returns immediately with `starting`; a background thread polls `/health` until ready or the process exits (→ `error` with the last log lines). Idempotent if already starting/ready. |
| `POST /api/model/stop` | Terminates the process; state → `stopped`. |
| `POST /api/chat` | Body `{target: "builtin" | "custom", endpoint?, payload}`. `builtin` → forwards `payload` to `http://127.0.0.1:<model_port>/v1/chat/completions` (error if not ready). `custom` → forwards to the given `endpoint` URL (http/https). Returns the upstream JSON and status. Proxying avoids browser CORS problems with tele_ai, Unsloth, or a LAN machine. |

**Process cleanup:** `llama-server.exe` is assigned to a Windows Job Object created via `ctypes` with `JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE`, so closing the console window (or Ctrl+C) kills the model and frees RAM. Also stopped explicitly on normal shutdown.

**Port in use:** if `ui_port` is taken, print a clear message (likely another Advanced window is open) and exit; the launcher still opens the browser to the existing instance.

### `advanced-ai.js` (classic script, loaded after `app.js`)

Renders into `#aiSlot`:
- **Source:** radio — Built-in model / Custom endpoint.
  - Built-in: Start/Stop button, status dot + text (polls `/api/model/status` while starting), model filename.
  - Custom: endpoint URL (default `http://127.0.0.1:8080/v1/chat/completions`) and model name.
- **Generate comment** button: calls the standard `buildAiPrompt()`; if empty, shows the same "select criteria and a descriptor first" message. Sends a chat payload (system + user messages, temperature 0.55, top_p 0.9, max_tokens 450, `chat_template_kwargs: {enable_thinking: false}`) via `/api/chat`, cleans the output (strips `<think>` blocks, any Gemma 4 reasoning/channel markup found during live testing, and "Comment:" prefixes), and writes it into the comment textarea.
- Status line for progress and errors.
- Source choice, endpoint and model name are saved in `localStorage` (wrapped in try/catch).

Styling in `advanced-ai.css`, reusing the standard tool's CSS variables/classes where possible.

### `setup.bat`

Uses only Windows 10/11 built-ins (`curl.exe`, `tar.exe`) to fetch the portable Python, then runs `setup_helper.py` with it for the llama.cpp and model checks.

| Component | Up-to-date check | Downloads when |
|---|---|---|
| Portable Python (official python.org embeddable zip, pinned latest 3.13.x) | `bin/python/python.exe` exists | missing |
| llama.cpp Windows CPU x64 build | GitHub latest-release tag vs `bin/llama.cpp/VERSION` | missing or newer tag |
| Gemma 4 E2B instruct GGUF, Q4 quant | file exists and size equals the size Hugging Face reports | missing or size mismatch; skipped when `config.json` `model_path` is set |

- Downloads go to `*.part` and are renamed only on success.
- Re-running with everything current prints "Everything up to date" and downloads nothing.
- If offline, existing components are left alone and the check is reported as skipped.
- Exact Hugging Face repo/filename for the E2B GGUF and the llama.cpp asset name pattern are confirmed during implementation (must be downloadable without login, and supported by the current llama.cpp release).

### `Open Advanced Marking Tool.bat`

1. Regenerates `../Rubric_Marking_Tool/program/datasets/_all.js` (same as the standard launcher).
2. If `bin/python/python.exe` is missing → prints "Run setup.bat first" and pauses.
3. Starts `bin/python/python.exe server.py` in the console window, opens `http://127.0.0.1:<ui_port>/` in the default browser.

The model is **not** loaded at launch; it loads on "Start" so using a custom endpoint costs no RAM.

### README (Advanced)

Setup steps, how to point at Unsloth/tele_ai, how to use a different GGUF, and Troubleshooting: SmartScreen warning on first run, school IT blocking unsigned executables, port conflicts, where the log is.

---

## Error handling summary

- Missing Python / llama-server / GGUF → specific message naming the expected path and "run setup.bat".
- Model fails to start → `error` state with last lines of `logs/llama-server.log`.
- Custom endpoint unreachable / non-2xx → message includes the endpoint and status.
- Empty model reply → "The model returned an empty response."
- Static path traversal → 404.

## Testing

- **server.py:** stdlib `unittest` suite in `tests/`, run with the bundled or system Python. Covers HTML injection, static path containment, `/advanced/` routing, `/api/chat` routing for builtin/custom, and the start → ready / start → error / stop state machine using a small fake llama-server script (serves `/health` and `/v1/chat/completions`).
- **Builder and standard tool:** no test framework exists; verify in the browser: Builder has no marking/comment UI, Canvas exports still produce the same CSV, Save/Load Plan works with an old saved plan; standard tool has no local-AI controls, Copy AI Prompt works, no console errors.
- **Live end-to-end (this machine):** run `setup.bat` from clean, re-run to confirm nothing re-downloads, launch, Start the model, generate a comment from a marked rubric (confirm no reasoning text leaks), Stop, then Start again and close the console window and confirm `llama-server.exe` is gone from Task Manager. Custom endpoint tested against a running llama-server/tele_ai on 8080 if available.
- **Release:** run `make_release.bat`, inspect the zip contents, unzip elsewhere and open both tools from the unzipped copy.

## Future work

- **Rubric converter:** tool to turn tabulated rubrics (Excel/CSV) into the `datasets/data*.js` format, as more rubrics are added.
- Optional Vulkan/GPU llama.cpp build selection in setup.

## Repo housekeeping

`.gitignore` additions: `Rubric_Marking_Tool_Advanced/bin/`, `Rubric_Marking_Tool_Advanced/models/`, `Rubric_Marking_Tool_Advanced/logs/`, `release/`. The existing `Rubric_Marking_Tool/models/` entry is removed (that folder is no longer used).
