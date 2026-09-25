# Builder Cleanup & Advanced Marking Tool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Strip the Rubric Builder to design+export, remove the local-AI panel from the standard Marking Tool, add a release-zip script, and build a standalone opt-in `Rubric_Marking_Tool_Advanced/` add-on that runs Gemma 4 E2B through llama.cpp.

**Architecture:** The Builder and standard Marking Tool stay static `file://` HTML apps. The Advanced add-on is a Python standard-library server (`server.py`) that serves the standard tool's files with an extra script injected, launches/stops the official `llama-server.exe` inside a kill-on-close Windows Job Object, and proxies chat requests to the built-in model or a custom endpoint. `setup.bat` fetches the portable (embeddable) Python, then runs `setup_helper.py` with it to fetch/update llama.cpp and the model.

**Tech Stack:** Vanilla HTML/CSS/JS; Python 3.13 standard library (`http.server`, `urllib`, `subprocess`, `ctypes`, `unittest`); llama.cpp `llama-server.exe` (Windows CPU x64 build); `unsloth/gemma-4-E2B-it-GGUF` → `gemma-4-E2B-it-Q4_K_M.gguf` (3.1 GB, Apache-2.0, ungated); Windows built-ins `curl.exe` / `tar.exe`.

**Spec:** `docs/superpowers/specs/2026-09-26-builder-cleanup-and-advanced-ai-design.md`

---

## Facts verified while planning (do not re-derive)

- **llama.cpp releases are flagged "prerelease"**, so `GET /repos/ggml-org/llama.cpp/releases/latest` returns an unrelated `v0.5.0` tag. Use `/releases?per_page=20` and take the first release with an asset named `llama-<tag>-bin-win-cpu-x64.zip` (e.g. `llama-b11191-bin-win-cpu-x64.zip`, ~18 MB). The zip extracts flat (`llama-server.exe` + DLLs at the top level).
- **`llama-server.exe` flags used:** `-m`, `--host`, `--port`, `-c`, `-t`, `--reasoning off`, `--no-webui`. `/health` returns 503 while loading, 200 when ready. With `--reasoning off` Gemma 4 returns clean `message.content` (tested live with gemma-4-E4B: no reasoning text, ~7.6 tok/s on CPU).
- **Embeddable Python 3.13.15** (`https://www.python.org/ftp/python/3.13.15/python-3.13.15-embed-amd64.zip`) includes `http.server`, `urllib`, `ssl` (HTTPS to GitHub/Hugging Face works using the Windows cert store), `ctypes`, `unittest`, `zipfile`. Its `python313._pth` means **the script's own directory is NOT on `sys.path`** — any script importing a sibling module must insert its directory into `sys.path` itself.
- **Git Bash's `tar` cannot read zip files.** Batch files must call `%SystemRoot%\System32\tar.exe` and `%SystemRoot%\System32\curl.exe` explicitly.
- **`ThreadingHTTPServer` sets `allow_reuse_address = True`, which on Windows lets a second server bind the same port silently.** Our server subclass must set `allow_reuse_address = False`.
- Hugging Face tree API: `GET https://huggingface.co/api/models/<repo>/tree/main` → list of `{path, size, ...}`. Download URL: `https://huggingface.co/<repo>/resolve/main/<file>` (redirects to a CDN; urllib follows it).

## Conventions

- Repo root: `C:\Code Projects\Marking_Tools` (all paths below are relative to it).
- `Rubric_Builder/program/datasets/_all.js` and `Rubric_Marking_Tool/program/datasets/_all.js` show as modified because the launchers regenerate them. **Never stage them** unless a task says to.
- Every commit message ends with:
  ```
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  ```
- Python tests run from `Rubric_Marking_Tool_Advanced/` with: `python -m unittest discover -s tests -v` (system Python 3.12+ is fine; the embeddable Python also works).

## File map

| File | Action | Responsibility |
|---|---|---|
| `.gitignore` | modify | ignore Advanced `bin/`, `models/`, `logs/`, and `release/` |
| `Rubric_Builder/program/index.html` | rewrite | design + export UI only |
| `Rubric_Builder/program/app.js` | rewrite | library, rubric table, Canvas export, save/load plan |
| `Rubric_Builder/program/styles.css` | modify | drop marking/comment/AI/tab rules |
| `Rubric_Builder/program/README.md` | rewrite | Builder docs |
| `Rubric_Marking_Tool/program/index.html` | modify | remove local-AI controls, add `#aiSlot` |
| `Rubric_Marking_Tool/program/app.js` | modify | remove local-AI code |
| `Rubric_Marking_Tool/program/styles.css` | modify | drop `.ai-advanced` / `.ai-fields` |
| `Rubric_Marking_Tool/program/README.md` | rewrite | Marking Tool docs |
| `Rubric_Marking_Tool/program/embedded-ai.js`, `transformers.min.js` | delete | dead code |
| `make_release.bat` | create | build `release/marking-tools-<version>.zip` |
| `Rubric_Marking_Tool_Advanced/config.json` | create | defaults |
| `Rubric_Marking_Tool_Advanced/server.py` | create | static + injection, model manager, chat proxy, entry point |
| `Rubric_Marking_Tool_Advanced/setup_helper.py` | create | llama.cpp + model download/update |
| `Rubric_Marking_Tool_Advanced/setup.bat` | create | fetch portable Python, run `setup_helper.py` |
| `Rubric_Marking_Tool_Advanced/Open Advanced Marking Tool.bat` | create | launcher |
| `Rubric_Marking_Tool_Advanced/web/advanced-ai.js`, `advanced-ai.css` | create | AI panel UI |
| `Rubric_Marking_Tool_Advanced/tests/*` | create | unittest suite, fake llama-server, job test helper |
| `Rubric_Marking_Tool_Advanced/README.md` | create | setup/usage/troubleshooting |

**Deviation from spec (intentional):** the spec said `setup.bat` would use PowerShell for JSON parsing. Because the embeddable Python is downloaded first anyway, the llama.cpp/model logic lives in `setup_helper.py` instead — testable, and no PowerShell needed. `config.json` also gains `model_repo`/`model_file` keys so the server and setup share one source for the model name.

---

## Task 1: Repo housekeeping

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Replace `.gitignore` contents**

Current contents are `node_modules/` and `Rubric_Marking_Tool/models/`. Replace the whole file with:

```
node_modules/
release/
Rubric_Marking_Tool_Advanced/bin/
Rubric_Marking_Tool_Advanced/models/
Rubric_Marking_Tool_Advanced/logs/
__pycache__/
```

- [ ] **Step 2: Commit**

```bash
git add .gitignore
git commit -m "chore: gitignore entries for advanced tool and releases

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 2: Builder — HTML and CSS

**Files:**
- Modify: `Rubric_Builder/program/index.html`
- Modify: `Rubric_Builder/program/styles.css`

- [ ] **Step 1: Rewrite `Rubric_Builder/program/index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Rubric Builder</title>
    <link rel="stylesheet" href="styles.css">
  </head>
  <body>
    <div class="app-shell">
      <header class="topbar">
        <div>
          <p class="eyebrow" id="activeDatasetLabel">Science – Stage 5</p>
          <h1>Rubric Builder</h1>
        </div>
        <div class="top-actions">
          <button id="savePlan" type="button">Save Plan</button>
          <button id="loadPlan" type="button">Load Plan</button>
          <button id="printView" type="button">Print</button>
        </div>
      </header>

      <main class="workspace">
        <aside class="library" aria-label="Rubric library">
          <div class="panel-heading">
            <h2>Outcomes</h2>
            <span id="dataSummary"></span>
          </div>
          <label class="dataset-row">
            <span>Subject</span>
            <select id="subjectSelect"></select>
          </label>
          <label class="dataset-row">
            <span>Stage</span>
            <select id="stageSelect"></select>
          </label>
          <label class="search-box">
            <span>Search</span>
            <input id="searchInput" type="search" placeholder="Outcome, topic, skill">
          </label>
          <div class="filter-row" role="group" aria-label="Outcome type">
            <button class="filter active" type="button" data-filter="all">All</button>
            <button class="filter" type="button" data-filter="skills">Skills</button>
            <button class="filter" type="button" data-filter="content">Content</button>
          </div>
          <div id="rubricList" class="rubric-list"></div>
        </aside>

        <section class="builder" aria-label="Assignment rubric builder">
          <div class="assignment-bar">
            <label>
              <span>Assignment</span>
              <input id="assignmentTitle" type="text" value="Science Assessment">
            </label>
          </div>

          <section id="designView" class="view">
            <div class="view-heading">
              <div>
                <h2>Selected Rubric</h2>
                <p id="selectedSummary">Choose outcomes on the left.</p>
              </div>
              <div class="card-actions">
                <button id="exportCanvasSimple" type="button">Export Simple Rubric</button>
                <button id="exportCanvasRanged" type="button">Export Ranged Rubric</button>
                <button id="clearSelection" type="button">Clear</button>
              </div>
            </div>
            <div id="rubricTable" class="rubric-table-wrap empty-state"></div>
            <div id="canvasExportPanel" class="export-panel" hidden>
              <div class="view-heading">
                <div>
                  <h2>Canvas CSV Export</h2>
                  <p id="canvasExportMeta"></p>
                </div>
                <div class="card-actions">
                  <button id="saveCanvasCsv" type="button">Save As</button>
                  <button id="downloadCanvasCsv" type="button">Download</button>
                  <button id="copyCanvasCsv" type="button">Copy CSV</button>
                </div>
              </div>
              <textarea id="canvasCsvOutput" spellcheck="false"></textarea>
            </div>
          </section>
        </section>
      </main>
    </div>

    <script src="datasets/_all.js"></script>
    <script src="app.js"></script>
  </body>
</html>
```

- [ ] **Step 2: Edit `Rubric_Builder/program/styles.css`**

Make these exact changes:

1. In the grouped rule near the top (`button.primary, .filter.active, .tab.active {`), delete the `.tab.active` selector line and the comma before it so it reads:
   ```css
   button.primary,
   .filter.active {
   ```
2. In the grouped flex rule (`.top-actions, .filter-row, .tabs, .mode-row, .grade-row, .modifier-row, .card-actions {`), remove `.tabs,`, `.grade-row,` and `.modifier-row,` so it reads:
   ```css
   .top-actions,
   .filter-row,
   .mode-row,
   .card-actions {
   ```
3. Change `.assignment-bar`'s `grid-template-columns: minmax(220px, 2fr) minmax(170px, 1fr) 150px;` to `grid-template-columns: minmax(220px, 480px);`.
4. Delete these whole rule blocks: `.tabs { … }`, `.tab { … }`, `.tab.active { … }` (the second one, with `background: transparent`), `.view.active { … }`, `.marking-list { … }`, `.mark-card { … }`, `.mark-card.selected { … }`, `.grade-row { … }`, `.grade-option { … }`, `.grade-option.active, .modifier-option.active { … }`, `.modifier-row { … }`, `.modifier-option { … }`, `.modifier-option:disabled { … }`, `.scale-note { … }`, `.descriptor { … }`, `.grade-chip { … }`, `.comment-layout { … }`, `#commentOutput { … }`, `.comment-tools { … }`, `.ai-box { … }`, `.ai-status { … }`, `.ai-status.error { … }`, `.ai-status.working { … }`.
5. Replace the `.view { display: none; padding: 16px; }` block with:
   ```css
   .view {
     padding: 16px;
   }
   ```
6. In `@media (max-width: 980px)`, change `.workspace,\n  .comment-layout {` to `.workspace {`.
7. Replace the `@media print { … }` block with:
   ```css
   @media print {
     .library,
     .top-actions,
     .export-panel,
     button {
       display: none !important;
     }

     body {
       background: #fff;
     }

     .workspace {
       display: block;
       padding: 0;
     }

     .builder,
     .topbar {
       box-shadow: none;
       border: 0;
     }
   }
   ```

- [ ] **Step 3: Check no removed selector remains**

Run: `grep -nE "\.tab\b|\.tabs|mark-card|grade-|modifier-|scale-note|\.descriptor|comment-|commentOutput|ai-box|ai-status|marking-list" Rubric_Builder/program/styles.css`
Expected: no output.

(Do not commit yet — `app.js` still references removed elements; Task 3 commits both.)

---

## Task 3: Builder — `app.js` rewrite

**Files:**
- Rewrite: `Rubric_Builder/program/app.js`

- [ ] **Step 1: Replace `Rubric_Builder/program/app.js` with:**

```js
const datasets = window.RUBRIC_DATASETS || {};
const gradePoints = { E: 2, D: 5, C: 8, B: 11, A: 14, "A++": 16 };
const pointGrades = ["E", "D", "C", "B", "A", "A++"];
const levelLabels = {
  E: "Limited",
  D: "Working Towards Standard",
  C: "At Standard",
  B: "Above Standard",
  A: "Well Above Standard",
  "A++": "Beyond Stage",
};
const canvasRatings = [
  { grade: "A++", name: "Beyond Stage", points: 5 },
  { grade: "A", name: "Well Above Standard", points: 5 },
  { grade: "B", name: "Above Standard", points: 4 },
  { grade: "C", name: "At Standard", points: 3 },
  { grade: "D", name: "Working Towards Standard", points: 2 },
  { grade: "E", name: "Limited", points: 1 },
  { grade: null, name: "No Evidence / Not Submitted", points: 0 },
];
const modifiers = [
  { key: "minus", offset: -1 },
  { key: "solid", offset: 0 },
  { key: "plus", offset: 1 },
];

const state = {
  filter: "all",
  search: "",
  selected: {},
  activeDataset: Object.keys(datasets).includes("science-s5") ? "science-s5" : Object.keys(datasets)[0] || "",
};

const els = {
  activeDatasetLabel: document.querySelector("#activeDatasetLabel"),
  subjectSelect: document.querySelector("#subjectSelect"),
  stageSelect: document.querySelector("#stageSelect"),
  dataSummary: document.querySelector("#dataSummary"),
  searchInput: document.querySelector("#searchInput"),
  rubricList: document.querySelector("#rubricList"),
  selectedSummary: document.querySelector("#selectedSummary"),
  rubricTable: document.querySelector("#rubricTable"),
  assignmentTitle: document.querySelector("#assignmentTitle"),
  canvasExportPanel: document.querySelector("#canvasExportPanel"),
  canvasExportMeta: document.querySelector("#canvasExportMeta"),
  canvasCsvOutput: document.querySelector("#canvasCsvOutput"),
};

const subjectGroups = {};
Object.entries(datasets).forEach(([key, ds]) => {
  const label = ds.label || key;
  const parts = label.split(" – ");
  const subject = parts[0].trim();
  const stage = parts[1]?.trim() || label;
  if (!subjectGroups[subject]) subjectGroups[subject] = [];
  subjectGroups[subject].push({ key, stage });
});

function populateStageSelect(subject) {
  els.stageSelect.innerHTML = "";
  (subjectGroups[subject] || []).forEach(({ key, stage }) => {
    const opt = document.createElement("option");
    opt.value = key;
    opt.textContent = stage;
    els.stageSelect.append(opt);
  });
}

function syncDatasetSelects() {
  for (const [subject, items] of Object.entries(subjectGroups)) {
    if (items.some((item) => item.key === state.activeDataset)) {
      els.subjectSelect.value = subject;
      populateStageSelect(subject);
      els.stageSelect.value = state.activeDataset;
      return;
    }
  }
}

function criterionId(code, mode) {
  return `${code}:${mode}`;
}

function modeLabel(mode) {
  return mode === "theory" ? "Theory" : "Applied";
}

function levelLabel(grade) {
  return levelLabels[grade] || grade;
}

function levelValue(grade, modifier = "solid") {
  if (grade === "A++") return 16;
  const mod = modifiers.find((item) => item.key === modifier) || modifiers[1];
  return Math.max(1, Math.min(15, gradePoints[grade] + mod.offset));
}

function allRubrics() {
  return Object.values(datasets).flatMap((ds) => ds.rubrics || []);
}

function selectedCriteria() {
  return allRubrics().flatMap((rubric) => {
    const modes = state.selected[rubric.code] || [];
    return modes.map((mode) => ({
      id: criterionId(rubric.code, mode),
      mode,
      rubric,
      component: rubric.components[mode],
    }));
  });
}

function shortText(text, max = 150) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}...` : clean;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function csvEscape(value) {
  const text = String(value ?? "").replace(/\r?\n/g, "\n");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function downloadTextFile(filename, text, mimeType = "text/csv;charset=utf-8") {
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function saveTextFile(filename, text) {
  if (window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [
          {
            description: "CSV file",
            accept: { "text/csv": [".csv"] },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(new TextEncoder().encode(text));
      await writable.close();
      toast(`Canvas rubric CSV saved (${text.length} characters)`);
      return true;
    } catch (error) {
      if (error.name === "AbortError") {
        toast("Save cancelled");
        return false;
      }
      toast("Save As failed; use Copy CSV or Download");
      return false;
    }
  }

  toast("Save As is not available in this browser");
  return false;
}

function downloadCsvFile(filename, text) {
  downloadTextFile(filename, text);
  toast(`Canvas rubric CSV downloaded (${text.length} characters)`);
}

function showCanvasExport(filename, csv) {
  els.canvasExportPanel.hidden = false;
  els.canvasExportMeta.textContent = `${filename} - ${csv.length} characters. If saving/downloading is blocked, use Copy CSV.`;
  els.canvasCsvOutput.value = csv;
  els.canvasCsvOutput.dataset.filename = filename;
}

function safeFilename(value) {
  return String(value || "canvas-rubric")
    .trim()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function criterionCanvasName(item) {
  const selectedModes = state.selected[item.rubric.code] || [];
  const modeSuffix = selectedModes.length > 1 ? ` - ${modeLabel(item.mode)}` : "";
  return `${item.rubric.code} ${item.rubric.title}${modeSuffix}`;
}

function canvasCriterionDescription(item) {
  return item.rubric.description || `${item.rubric.code} ${item.rubric.title}`;
}

async function exportCanvasRubricCsv(useRange = false) {
  const criteria = selectedCriteria();
  if (!criteria.length) {
    toast("Select at least one outcome before exporting");
    return;
  }

  const rubricTitle = els.assignmentTitle.value.trim() || "Science Assessment";
  const maxRatings = canvasRatings.length;
  const header = ["Rubric Name", "Criteria Name", "Criteria Description", "Criteria Enable Range"];
  for (let i = 0; i < maxRatings; i += 1) {
    header.push("Rating Name", "Rating Description", "Rating Points");
  }

  const rows = criteria.map((item) => {
    const row = [rubricTitle, criterionCanvasName(item), canvasCriterionDescription(item), useRange];
    canvasRatings.forEach((rating) => {
      const description = rating.grade
        ? item.component.descriptors[rating.grade] || rating.name
        : "No evidence has been provided for this criterion, or the relevant section was not submitted.";
      const points = useRange
        ? (rating.grade ? levelValue(rating.grade, "plus") : 0).toFixed(1)
        : rating.points;
      row.push(rating.name, description, points);
    });
    return row;
  });

  const csv = [header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\r\n");
  if (csv.trim().length < 50) {
    toast("Export stopped: CSV content was unexpectedly empty");
    return;
  }
  const suffix = useRange ? "-ranged" : "-simple";
  const filename = `${safeFilename(rubricTitle)}${suffix}-canvas-rubric.csv`;
  showCanvasExport(filename, csv);
  const saved = await saveTextFile(filename, csv);
  if (!saved) {
    downloadCsvFile(filename, csv);
  }
}

function renderLibrary() {
  const activeData = datasets[state.activeDataset] || { summary: { skills: 0, content: 0 }, rubrics: [] };
  const query = state.search.toLowerCase();
  const rubrics = activeData.rubrics.filter((rubric) => {
    const typeMatch = state.filter === "all" || rubric.type === state.filter;
    const text = `${rubric.code} ${rubric.title} ${rubric.description} ${rubric.sheet}`.toLowerCase();
    return typeMatch && text.includes(query);
  });

  els.dataSummary.textContent = `${activeData.summary.skills} skills, ${activeData.summary.content} content`;
  if (els.activeDatasetLabel) els.activeDatasetLabel.textContent = activeData.label || state.activeDataset;
  els.rubricList.innerHTML = rubrics
    .map((rubric) => {
      const selectedModes = state.selected[rubric.code] || [];
      const selectedClass = selectedModes.length ? " selected" : "";
      return `
        <article class="rubric-card${selectedClass}">
          <header>
            <div>
              <h3>${escapeHtml(rubric.title)}</h3>
              <div class="meta">${escapeHtml(rubric.sheet)}</div>
            </div>
            <span class="code-pill">${escapeHtml(rubric.code)}</span>
          </header>
          <p>${escapeHtml(shortText(rubric.description, 180))}</p>
          <div class="mode-row">
            ${rubric.availableModes
              .map(
                (mode) => `
                  <label>
                    <input type="checkbox" data-code="${escapeHtml(rubric.code)}" data-mode="${mode}" ${
                  selectedModes.includes(mode) ? "checked" : ""
                }>
                    ${modeLabel(mode)}
                  </label>`
              )
              .join("")}
          </div>
        </article>`;
    })
    .join("");
}

function renderRubricTable() {
  const criteria = selectedCriteria();
  els.selectedSummary.textContent = criteria.length
    ? `${criteria.length} criteria selected from ${Object.keys(state.selected).length} outcomes.`
    : "Choose outcomes on the left.";

  if (!criteria.length) {
    els.rubricTable.className = "rubric-table-wrap empty-state";
    els.rubricTable.textContent = "Your assignment rubric will appear here.";
    return;
  }

  const grades = pointGrades;
  els.rubricTable.className = "rubric-table-wrap";
  els.rubricTable.innerHTML = `
    <table class="rubric-table">
      <thead>
        <tr>
          <th>Criterion</th>
          ${grades.map((grade) => `<th>${levelLabel(grade)}</th>`).join("")}
        </tr>
      </thead>
      <tbody>
        ${criteria
          .map(
            ({ rubric, mode, component }) => `
              <tr>
                <td class="criterion-cell">
                  ${escapeHtml(rubric.code)}<br>
                  ${escapeHtml(rubric.title)}<br>
                  <span class="meta">${modeLabel(mode)}</span>
                </td>
                ${grades
                  .map((grade) => `<td>${escapeHtml(component.descriptors[grade] || "")}</td>`)
                  .join("")}
              </tr>`
          )
          .join("")}
      </tbody>
    </table>`;
}

function renderAll() {
  renderLibrary();
  renderRubricTable();
}

function savePlan() {
  const payload = {
    assignmentTitle: els.assignmentTitle.value,
    selected: state.selected,
    activeDataset: state.activeDataset,
  };
  localStorage.setItem("stage5ScienceRubricPlan", JSON.stringify(payload));
  toast("Saved in this browser");
}

function loadPlan() {
  const raw = localStorage.getItem("stage5ScienceRubricPlan");
  if (!raw) {
    toast("No saved plan found");
    return;
  }
  // Plans saved by older versions also contain marks, comments and AI settings; those are ignored.
  const payload = JSON.parse(raw);
  els.assignmentTitle.value = payload.assignmentTitle || els.assignmentTitle.value;
  state.selected = payload.selected || {};
  if (payload.activeDataset && datasets[payload.activeDataset]) {
    state.activeDataset = payload.activeDataset;
    syncDatasetSelects();
  }
  renderAll();
  toast("Loaded");
}

function toast(message) {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = message;
  document.body.append(el);
  setTimeout(() => el.remove(), 1800);
}

document.querySelectorAll(".filter").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".filter").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    state.filter = button.dataset.filter;
    renderLibrary();
  });
});

els.searchInput.addEventListener("input", (event) => {
  state.search = event.target.value;
  renderLibrary();
});

els.rubricList.addEventListener("change", (event) => {
  const input = event.target;
  if (!input.matches("input[type='checkbox']")) return;
  const { code, mode } = input.dataset;
  const modes = new Set(state.selected[code] || []);
  if (input.checked) modes.add(mode);
  else modes.delete(mode);
  if (modes.size) state.selected[code] = [...modes];
  else delete state.selected[code];
  renderAll();
});

document.querySelector("#clearSelection").addEventListener("click", () => {
  state.selected = {};
  els.canvasCsvOutput.value = "";
  els.canvasExportPanel.hidden = true;
  renderAll();
});

document.querySelector("#exportCanvasSimple").addEventListener("click", () => exportCanvasRubricCsv(false));
document.querySelector("#exportCanvasRanged").addEventListener("click", () => exportCanvasRubricCsv(true));
document.querySelector("#saveCanvasCsv").addEventListener("click", async () => {
  const csv = els.canvasCsvOutput.value;
  const filename = els.canvasCsvOutput.dataset.filename || "canvas-rubric.csv";
  if (!csv.trim()) {
    toast("No CSV has been generated yet");
    return;
  }
  await saveTextFile(filename, csv);
});
document.querySelector("#downloadCanvasCsv").addEventListener("click", () => {
  const csv = els.canvasCsvOutput.value;
  const filename = els.canvasCsvOutput.dataset.filename || "canvas-rubric.csv";
  if (!csv.trim()) {
    toast("No CSV has been generated yet");
    return;
  }
  downloadCsvFile(filename, csv);
});
document.querySelector("#copyCanvasCsv").addEventListener("click", async () => {
  const csv = els.canvasCsvOutput.value;
  if (!csv.trim()) {
    toast("No CSV has been generated yet");
    return;
  }
  await navigator.clipboard.writeText(csv);
  toast("Canvas CSV copied");
});

Object.keys(subjectGroups).forEach((subject) => {
  const opt = document.createElement("option");
  opt.value = subject;
  opt.textContent = subject;
  els.subjectSelect.append(opt);
});
syncDatasetSelects();
els.subjectSelect.addEventListener("change", () => {
  populateStageSelect(els.subjectSelect.value);
  state.activeDataset = els.stageSelect.value;
  renderLibrary();
});
els.stageSelect.addEventListener("change", () => {
  state.activeDataset = els.stageSelect.value;
  renderLibrary();
});

document.querySelector("#savePlan").addEventListener("click", savePlan);
document.querySelector("#loadPlan").addEventListener("click", loadPlan);
document.querySelector("#printView").addEventListener("click", () => window.print());

renderAll();
```

Note: the Canvas export code (`exportCanvasRubricCsv`, `levelValue`, `canvasRatings`) is byte-for-byte the same logic as before, so exported CSVs are unchanged.

- [ ] **Step 2: Syntax check**

Run: `node --check Rubric_Builder/program/app.js`
Expected: no output, exit code 0. (If Node isn't available, skip — Task 4's browser check catches syntax errors.)

---

## Task 4: Builder — README, browser verification, commit

**Files:**
- Rewrite: `Rubric_Builder/program/README.md`

- [ ] **Step 1: Rewrite `Rubric_Builder/program/README.md`**

```markdown
# Rubric Builder

Double-click `Open Rubric Builder.bat` (it refreshes the rubric datasets, then opens `program/index.html`).

The Builder is for creating and exporting rubrics:

- choose a subject and stage, then search or filter outcomes
- tick Theory, Applied, or both for each outcome
- name the assignment and review the combined rubric table
- export the rubric to Canvas (simple or ranged points)
- save and reload the current plan in this browser
- print the rubric

To mark students and write feedback comments, use the Rubric Marking Tool.

## Canvas rubric export

`Export Simple Rubric` and `Export Ranged Rubric` show the CSV in the app, then try to save it with a Save As picker. If saving is blocked, use `Download` or `Copy CSV` from the export panel.

Simple rubric points:

- No Evidence / Not Submitted: 0
- Limited: 1
- Working Towards Standard: 2
- At Standard: 3
- Above Standard: 4
- Well Above Standard: 5
- Beyond Stage: 5

The ranged rubric enables Canvas point ranges and uses the top of each level's teacher-scale band as the rating's points.

Canvas instances can be picky about their import template. If yours rejects the file, download the official rubric upload template from your Canvas instance so the exporter can be adjusted to match it.
```

- [ ] **Step 2: Verify in the browser**

1. Regenerate datasets exactly as the launcher does (from repo root, in cmd): `cmd /c "cd /d Rubric_Builder && (for %f in ("program\datasets\data*.js") do type "%f") > "program\datasets\_all.js""` — or just double-click `Rubric_Builder/Open Rubric Builder.bat`.
2. Open `file:///C:/Code%20Projects/Marking_Tools/Rubric_Builder/program/index.html` in the built-in browser (`mcp__Claude_Browser__navigate`).
3. `read_console_messages` with `onlyErrors: true` → expected: none.
4. `read_page` → expected: no "Mark Student"/"Generate Comment" tabs, no Student/Tone fields; Save Plan/Load Plan/Print present.
5. Tick two outcomes (Theory on one, both modes on another) → rubric table shows 3 rows.
6. Click Export Simple Rubric → export panel appears with CSV; first line starts `Rubric Name,Criteria Name,Criteria Description,Criteria Enable Range,Rating Name,...`. Click Export Ranged Rubric → `Criteria Enable Range` column is `true` and points look like `16.0`, `15.0`, `12.0`, `9.0`, `6.0`, `3.0`, `0.0`.
7. Old-plan compatibility: run in the page via `javascript_tool`:
   ```js
   localStorage.setItem("stage5ScienceRubricPlan", JSON.stringify({assignmentTitle:"Old Plan", studentName:"X", marks:{a:1}, aiEndpoint:"x", selected:{}, activeDataset: Object.keys(window.RUBRIC_DATASETS)[0]}));
   document.querySelector("#loadPlan").click();
   document.querySelector("#assignmentTitle").value
   ```
   Expected: `"Old Plan"` and no console errors.
8. Take a screenshot as proof.

- [ ] **Step 3: Commit**

```bash
git add Rubric_Builder/program/index.html Rubric_Builder/program/app.js Rubric_Builder/program/styles.css Rubric_Builder/program/README.md
git commit -m "feat(builder): strip to rubric design and Canvas export only

Removes marking, comment generation and local AI from the Builder; those
live in the Rubric Marking Tool. Old saved plans still load.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 5: Standard Marking Tool — remove local AI, add `#aiSlot`

**Files:**
- Modify: `Rubric_Marking_Tool/program/index.html`
- Modify: `Rubric_Marking_Tool/program/app.js`
- Modify: `Rubric_Marking_Tool/program/styles.css`
- Rewrite: `Rubric_Marking_Tool/program/README.md`
- Delete: `Rubric_Marking_Tool/program/embedded-ai.js`, `Rubric_Marking_Tool/program/transformers.min.js`

- [ ] **Step 1: Edit `index.html`** — replace the whole `<div class="ai-box"> … </div>` block (it contains `generateAiComment`, `copyAiPrompt`, the `<details class="ai-advanced">` and `#aiStatus`) with:

```html
                <div class="ai-box">
                  <div id="aiSlot"></div>
                  <button id="copyAiPrompt" type="button">Copy AI Prompt</button>
                  <p id="aiStatus" class="ai-status">Copy the prompt, paste it into Copilot or any AI tool, then paste the result into the comment box.</p>
                </div>
```

- [ ] **Step 2: Edit `app.js`**

1. In `const els = { … }` delete the two lines:
   ```js
     aiEndpoint: document.querySelector("#aiEndpoint"),
     aiModel: document.querySelector("#aiModel"),
   ```
   (keep `aiStatus`).
2. In `buildSessionPayload()` delete:
   ```js
       aiEndpoint: els.aiEndpoint.value,
       aiModel: els.aiModel.value,
   ```
3. In `restoreSession(payload)` delete:
   ```js
     els.aiEndpoint.value = payload.aiEndpoint || "http://127.0.0.1:8080/v1/chat/completions";
     els.aiModel.value = payload.aiModel || "local-model";
   ```
   Old sessions containing these keys are simply ignored.
4. Delete the whole `function cleanAiComment(text) { … }` and the whole `async function generateWithLocalAi() { … }` (they sit directly after `setAiStatus`). **Keep** `setAiStatus` and `buildAiPrompt`.
5. Delete the line:
   ```js
   document.querySelector("#generateAiComment").addEventListener("click", generateWithLocalAi);
   ```
6. In the `#copyAiPrompt` click handler change the success message to:
   ```js
     setAiStatus("AI prompt copied. Paste it into Copilot or any AI tool.");
   ```
7. Directly above `function buildAiPrompt() {` add this comment (it documents the add-on contract):
   ```js
   // Add-on contract: Rubric_Marking_Tool_Advanced/web/advanced-ai.js (loaded after this file)
   // calls buildAiPrompt(), setAiStatus() and writes els.commentOutput. Keep these as top-level
   // declarations so they stay reachable from other classic scripts.
   ```

- [ ] **Step 3: Check no local-AI references remain**

Run: `grep -nE "aiEndpoint|aiModel|generateAiComment|generateWithLocalAi|cleanAiComment|embedded-ai|transformers" Rubric_Marking_Tool/program/app.js Rubric_Marking_Tool/program/index.html`
Expected: no output.

- [ ] **Step 4: Edit `styles.css`** — delete the comment line `/* === AI server settings collapse === */` and the blocks `.ai-advanced { … }`, `.ai-advanced summary { … }`, `.ai-advanced summary::-webkit-details-marker { … }`, `.ai-advanced summary::before { … }`, `.ai-advanced[open] summary::before { … }`, `.ai-fields { … }`. Keep `.ai-box` and `.ai-status*`.

Run: `grep -n "ai-advanced\|ai-fields" Rubric_Marking_Tool/program/styles.css` → expected: no output.

- [ ] **Step 5: Delete dead files**

```bash
git rm Rubric_Marking_Tool/program/embedded-ai.js Rubric_Marking_Tool/program/transformers.min.js
```

- [ ] **Step 6: Rewrite `Rubric_Marking_Tool/program/README.md`**

```markdown
# Rubric Marking Tool

Double-click `Open Rubric Marking Tool.bat` (it refreshes the rubric datasets, then opens `program/index.html`).

The Marking Tool lets you:

- choose outcomes and build an assignment rubric (same library as the Rubric Builder)
- export the rubric to Canvas (simple or ranged points)
- mark a student against each criterion, with evidence notes
- generate an editable feedback comment
- copy an AI prompt to paste into Copilot or another AI tool for a richer comment
- keep a class roster and export class marks
- save/load the session in this browser, or export/import it as JSON
- print the rubric, marking sheet and comment

## Using AI for comments

1. Mark at least one criterion.
2. Open the Generate Comment tab, add optional task context and a teacher note.
3. Click `Copy AI Prompt` and paste it into Copilot (or any AI tool).
4. Paste the AI's reply into the comment box and edit as needed.

## Canvas rubric export

See the Rubric Builder README for the point mapping. If your Canvas rejects the file, download the official rubric upload template from your Canvas instance so the exporter can be adjusted to match it.
```

- [ ] **Step 7: Verify in the browser**

1. Open `file:///C:/Code%20Projects/Marking_Tools/Rubric_Marking_Tool/program/index.html`.
2. `read_console_messages` `onlyErrors: true` → none.
3. Comment tab: no "Generate with Local AI" button or "Server settings"; `Copy AI Prompt` and `Regenerate` present; `#aiSlot` exists and is empty (`javascript_tool`: `document.querySelector("#aiSlot").outerHTML` → `<div id="aiSlot"></div>`).
4. Select an outcome, mark one criterion, click Copy AI Prompt → status reads "AI prompt copied. Paste it into Copilot or any AI tool." (If clipboard permission blocks it in the pane, confirm instead via `javascript_tool`: `buildAiPrompt().startsWith("You are helping")` → `true`.)
5. Old-session compatibility via `javascript_tool`:
   ```js
   localStorage.setItem("rubricMarkingSession", JSON.stringify({version:1, assignmentTitle:"Old", aiEndpoint:"x", aiModel:"y", selected:{}, marks:{}, students:[]}));
   document.querySelector("#loadSession").click();
   document.querySelector("#assignmentTitle").value
   ```
   Expected `"Old"`, no console errors.

- [ ] **Step 8: Commit**

```bash
git add Rubric_Marking_Tool/program/index.html Rubric_Marking_Tool/program/app.js Rubric_Marking_Tool/program/styles.css Rubric_Marking_Tool/program/README.md
git commit -m "feat(marking): remove local AI panel, keep Copy AI Prompt

Adds an empty #aiSlot hook for the Advanced add-on and deletes the unused
Transformers.js experiment.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 6: Release packaging script

**Files:**
- Create: `make_release.bat`

- [ ] **Step 1: Create `make_release.bat`**

```bat
@echo off
setlocal
cd /d "%~dp0"

if "%~1"=="" (
  echo Usage: make_release.bat v1.0
  exit /b 1
)
set "VERSION=%~1"
set "TAR=%SystemRoot%\System32\tar.exe"
set "OUT=release\marking-tools-%VERSION%.zip"

rem Refresh the combined datasets so the zip works without running the launchers first.
(for %%f in ("Rubric_Builder\program\datasets\data*.js") do type "%%f") > "Rubric_Builder\program\datasets\_all.js"
(for %%f in ("Rubric_Marking_Tool\program\datasets\data*.js") do type "%%f") > "Rubric_Marking_Tool\program\datasets\_all.js"

if not exist release mkdir release
if exist "%OUT%" del "%OUT%"

"%TAR%" -a -c -f "%OUT%" --exclude "*/original rubrics" --exclude "*/original rubrics/*" --exclude "*/models" --exclude "*/models/*" Rubric_Builder Rubric_Marking_Tool
if errorlevel 1 (
  echo Zip failed.
  exit /b 1
)

echo Created %OUT%
```

- [ ] **Step 2: Run it and inspect the zip**

Run (PowerShell): `cmd /c make_release.bat v0.0-test; & "$env:SystemRoot\System32\tar.exe" -tf release\marking-tools-v0.0-test.zip`
Expected: listing contains `Rubric_Builder/Open Rubric Builder.bat`, `Rubric_Builder/program/index.html`, `Rubric_Marking_Tool/program/app.js`, `Rubric_Marking_Tool/program/datasets/_all.js`; contains **no** `original rubrics`, `Rubric_Marking_Tool_Advanced`, `docs`, `.claude`.
If `original rubrics` still appears, the bsdtar pattern needs adjusting — try `--exclude "original rubrics"` and re-check until the listing is clean.

- [ ] **Step 3: Smoke-test the unzipped copy**

Extract to the scratchpad: `& "$env:SystemRoot\System32\tar.exe" -xf release\marking-tools-v0.0-test.zip -C <scratchpad>\release-test`, open `<scratchpad>\release-test\Rubric_Marking_Tool\program\index.html` in the browser → outcomes list populates, no console errors. Then delete `release\marking-tools-v0.0-test.zip`.

- [ ] **Step 4: Commit**

```bash
git add make_release.bat
git commit -m "feat: make_release.bat builds the colleague release zip

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 7: Advanced — config and server pure functions (TDD)

**Files:**
- Create: `Rubric_Marking_Tool_Advanced/config.json`
- Create: `Rubric_Marking_Tool_Advanced/server.py`
- Create: `Rubric_Marking_Tool_Advanced/tests/support.py`
- Create: `Rubric_Marking_Tool_Advanced/tests/test_server_basics.py`

- [ ] **Step 1: Create `config.json`**

```json
{
  "ui_port": 8765,
  "model_port": 8766,
  "model_repo": "unsloth/gemma-4-E2B-it-GGUF",
  "model_file": "gemma-4-E2B-it-Q4_K_M.gguf",
  "model_path": "",
  "context_size": 4096,
  "threads": 0
}
```

- [ ] **Step 2: Create `tests/support.py`**

```python
"""Shared helpers for the Advanced Marking Tool tests."""
import socket
import sys
from pathlib import Path

TESTS_DIR = Path(__file__).resolve().parent
ROOT = TESTS_DIR.parent
# The embeddable Python does not put a script's own directory on sys.path.
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

FAKE_LLAMA = TESTS_DIR / "fake_llama_server.py"


def free_port():
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


def fake_command(port, *extra):
    """A build_command callable that launches the fake llama-server."""
    return lambda: [sys.executable, str(FAKE_LLAMA), "--port", str(port), *extra]
```

- [ ] **Step 3: Write the failing tests `tests/test_server_basics.py`**

```python
import json
import tempfile
import unittest
from pathlib import Path

import support  # noqa: F401  (puts the tool folder on sys.path)
import server


class InjectAdvancedTests(unittest.TestCase):
    def test_injects_css_before_head_and_script_before_body(self):
        html = '<html><head><title>x</title></head><body><script src="app.js"></script></body></html>'
        out = server.inject_advanced(html)
        self.assertIn('<link rel="stylesheet" href="/advanced/advanced-ai.css">\n</head>', out)
        self.assertIn(
            '<script src="app.js"></script><script src="/advanced/advanced-ai.js"></script>\n</body>', out
        )

    def test_html_without_tags_is_unchanged(self):
        self.assertEqual(server.inject_advanced("plain text"), "plain text")


class ResolveStaticTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.base = Path(self.tmp.name) / "program"
        (self.base / "datasets").mkdir(parents=True)
        (self.base / "index.html").write_text("<html></html>", encoding="utf-8")
        (self.base / "datasets" / "_all.js").write_text("//", encoding="utf-8")
        self.secret = Path(self.tmp.name) / "secret.txt"
        self.secret.write_text("secret", encoding="utf-8")

    def test_resolves_files_inside_base(self):
        self.assertEqual(server.resolve_static(self.base, "index.html"), (self.base / "index.html").resolve())
        self.assertEqual(
            server.resolve_static(self.base, "datasets/_all.js"), (self.base / "datasets" / "_all.js").resolve()
        )

    def test_rejects_paths_outside_base(self):
        self.assertIsNone(server.resolve_static(self.base, "../secret.txt"))
        self.assertIsNone(server.resolve_static(self.base, "..\\secret.txt"))
        self.assertIsNone(server.resolve_static(self.base, str(self.secret)))

    def test_missing_file_and_directory_are_none(self):
        self.assertIsNone(server.resolve_static(self.base, "nope.js"))
        self.assertIsNone(server.resolve_static(self.base, "datasets"))


class ConfigTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)

    def test_defaults_when_file_missing(self):
        config = server.load_config(self.root / "config.json")
        self.assertEqual(config, server.DEFAULT_CONFIG)
        self.assertIsNot(config, server.DEFAULT_CONFIG)

    def test_file_values_override_defaults(self):
        (self.root / "config.json").write_text(json.dumps({"ui_port": 9000}), encoding="utf-8")
        config = server.load_config(self.root / "config.json")
        self.assertEqual(config["ui_port"], 9000)
        self.assertEqual(config["model_port"], server.DEFAULT_CONFIG["model_port"])

    def test_model_path_defaults_to_models_folder(self):
        config = dict(server.DEFAULT_CONFIG)
        self.assertEqual(server.resolve_model_path(config, self.root), self.root / "models" / config["model_file"])

    def test_custom_model_path_wins(self):
        config = dict(server.DEFAULT_CONFIG, model_path="D:\\models\\other.gguf")
        self.assertEqual(server.resolve_model_path(config, self.root), Path("D:\\models\\other.gguf"))


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 4: Run tests to verify they fail**

Run (from `Rubric_Marking_Tool_Advanced/`): `python -m unittest discover -s tests -v`
Expected: error — `ModuleNotFoundError: No module named 'server'`.

- [ ] **Step 5: Create `server.py` with the pure functions**

```python
"""Advanced Rubric Marking Tool server.

Serves the standard Rubric Marking Tool with the Advanced AI panel injected,
starts/stops a built-in llama-server, and proxies chat requests to it or to a
custom endpoint. Standard library only, so it runs on the embeddable Python
that setup.bat downloads.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent

DEFAULT_CONFIG = {
    "ui_port": 8765,
    "model_port": 8766,
    "model_repo": "unsloth/gemma-4-E2B-it-GGUF",
    "model_file": "gemma-4-E2B-it-Q4_K_M.gguf",
    "model_path": "",
    "context_size": 4096,
    "threads": 0,
}

INJECT_HEAD = '<link rel="stylesheet" href="/advanced/advanced-ai.css">\n'
INJECT_BODY = '<script src="/advanced/advanced-ai.js"></script>\n'


def load_config(path):
    config = dict(DEFAULT_CONFIG)
    if path.is_file():
        config.update(json.loads(path.read_text(encoding="utf-8")))
    return config


def resolve_model_path(config, root):
    custom = str(config.get("model_path") or "").strip()
    return Path(custom) if custom else root / "models" / config["model_file"]


def _insert_before(html, tag, snippet):
    index = html.lower().rfind(tag)
    return html if index < 0 else html[:index] + snippet + html[index:]


def inject_advanced(html):
    """Add the Advanced panel's stylesheet and script to the standard tool's page."""
    return _insert_before(_insert_before(html, "</head>", INJECT_HEAD), "</body>", INJECT_BODY)


def resolve_static(base, relative):
    """Return the file at `relative` inside `base`, or None if missing or outside it."""
    base = base.resolve()
    target = (base / relative).resolve()
    if not target.is_relative_to(base) or not target.is_file():
        return None
    return target
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `python -m unittest discover -s tests -v`
Expected: 9 tests, all `ok`.

- [ ] **Step 7: Commit**

```bash
git add Rubric_Marking_Tool_Advanced/config.json Rubric_Marking_Tool_Advanced/server.py Rubric_Marking_Tool_Advanced/tests/support.py Rubric_Marking_Tool_Advanced/tests/test_server_basics.py
git commit -m "feat(advanced): config loading, page injection and safe static paths

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 8: Advanced — ModelManager with kill-on-close job (TDD)

**Files:**
- Create: `Rubric_Marking_Tool_Advanced/tests/fake_llama_server.py`
- Create: `Rubric_Marking_Tool_Advanced/tests/job_parent.py`
- Create: `Rubric_Marking_Tool_Advanced/tests/test_model_manager.py`
- Modify: `Rubric_Marking_Tool_Advanced/server.py`

- [ ] **Step 1: Create `tests/fake_llama_server.py`**

```python
"""Stand-in for llama-server.exe used by the tests.

--delay N  : /health returns 503 for N seconds, then 200
--fail     : print a load error and exit with code 3
"""
import argparse
import json
import sys
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, required=True)
    parser.add_argument("--delay", type=float, default=0.0)
    parser.add_argument("--fail", action="store_true")
    args = parser.parse_args()

    if args.fail:
        print("error: failed to load model 'fake.gguf'", flush=True)
        sys.exit(3)

    ready_at = time.monotonic() + args.delay

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *_):
            pass

        def _json(self, code, obj):
            data = json.dumps(obj).encode()
            self.send_response(code)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)

        def do_GET(self):
            if self.path == "/health":
                ready = time.monotonic() >= ready_at
                return self._json(200 if ready else 503, {"status": "ok" if ready else "loading model"})
            self._json(404, {})

        def do_POST(self):
            length = int(self.headers.get("Content-Length") or 0)
            body = json.loads(self.rfile.read(length) or b"{}")
            count = len(body.get("messages", []))
            self._json(200, {"choices": [{"message": {"role": "assistant", "content": f"Fake comment ({count} messages)"}}]})

    print("fake llama-server listening", flush=True)
    ThreadingHTTPServer(("127.0.0.1", args.port), Handler).serve_forever()


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Create `tests/job_parent.py`**

```python
"""Starts the fake model via ModelManager, prints its PID, then idles.

The job-object test kills this process and checks the model dies with it.
"""
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import support  # noqa: E402
import server  # noqa: E402

port = support.free_port()
manager = server.ModelManager(support.fake_command(port), port, Path(sys.argv[1]), health_timeout=15)
manager.start()
while manager.status()["state"] == "starting":
    time.sleep(0.2)
print(manager.pid(), flush=True)
time.sleep(60)
```

- [ ] **Step 3: Write the failing tests `tests/test_model_manager.py`**

```python
import subprocess
import sys
import tempfile
import time
import unittest
from pathlib import Path

import support
import server


def wait_for_state(manager, states, timeout=15):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        status = manager.status()
        if status["state"] in states:
            return status
        time.sleep(0.1)
    raise AssertionError(f"state never reached {states}; last {manager.status()}")


def pid_alive(pid):
    out = subprocess.run(["tasklist", "/FI", f"PID eq {pid}", "/NH"], capture_output=True, text=True).stdout
    return str(pid) in out


class ModelManagerTests(unittest.TestCase):
    def make(self, *extra, timeout=15, command=None):
        tmp = tempfile.TemporaryDirectory()
        port = support.free_port()
        manager = server.ModelManager(
            command or support.fake_command(port, *extra),
            port,
            Path(tmp.name) / "logs" / "llama-server.log",
            health_timeout=timeout,
        )
        self.addCleanup(tmp.cleanup)
        self.addCleanup(manager.stop)  # runs before tmp.cleanup (LIFO)
        return manager

    def test_initial_state_is_stopped(self):
        self.assertEqual(self.make().status(), {"state": "stopped", "error": None})

    def test_start_goes_starting_then_ready(self):
        manager = self.make("--delay", "1")
        manager.start()
        self.assertEqual(manager.status()["state"], "starting")
        self.assertEqual(wait_for_state(manager, {"ready", "error"})["state"], "ready")

    def test_start_twice_keeps_the_same_process(self):
        manager = self.make()
        manager.start()
        first = manager.pid()
        manager.start()
        self.assertEqual(manager.pid(), first)

    def test_stop_returns_to_stopped(self):
        manager = self.make()
        manager.start()
        wait_for_state(manager, {"ready"})
        manager.stop()
        self.assertEqual(manager.status(), {"state": "stopped", "error": None})
        self.assertIsNone(manager.pid())

    def test_crash_while_loading_reports_exit_code_and_log(self):
        manager = self.make("--fail")
        manager.start()
        status = wait_for_state(manager, {"error"})
        self.assertIn("exit code 3", status["error"])
        self.assertIn("failed to load model", status["error"])

    def test_timeout_reports_error_and_kills_process(self):
        manager = self.make("--delay", "30", timeout=1)
        manager.start()
        pid = manager.pid()
        status = wait_for_state(manager, {"error"})
        self.assertIn("did not become ready", status["error"])
        self.assertIsNone(manager.pid())
        if sys.platform == "win32":
            self.assertFalse(pid_alive(pid))

    def test_unlaunchable_command_reports_error(self):
        manager = self.make(command=lambda: ["definitely-not-a-real-program.exe"])
        manager.start()
        status = manager.status()
        self.assertEqual(status["state"], "error")
        self.assertIn("Could not start the model", status["error"])

    @unittest.skipUnless(sys.platform == "win32", "Windows job objects only")
    def test_model_dies_when_server_process_dies(self):
        with tempfile.TemporaryDirectory() as tmp:
            parent = subprocess.Popen(
                [sys.executable, str(support.TESTS_DIR / "job_parent.py"), str(Path(tmp) / "log.txt")],
                stdout=subprocess.PIPE,
                text=True,
            )
            child_pid = int(parent.stdout.readline())
            self.assertTrue(pid_alive(child_pid))
            parent.kill()
            parent.wait()
            parent.stdout.close()
            deadline = time.monotonic() + 5
            while pid_alive(child_pid) and time.monotonic() < deadline:
                time.sleep(0.2)
            self.assertFalse(pid_alive(child_pid))


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `python -m unittest discover -s tests -v`
Expected: the new tests error with `AttributeError: module 'server' has no attribute 'ModelManager'`; Task 7 tests still pass.

- [ ] **Step 5: Add the implementation to `server.py`**

Replace the import block at the top of `server.py`:

```python
import json
from pathlib import Path
```

with:

```python
import json
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request
from pathlib import Path
```

Then append to the end of `server.py`:

```python
# Direct connections only: a system proxy must never see localhost traffic or student data.
_OPENER = urllib.request.build_opener(urllib.request.ProxyHandler({}))


def tail_file(path, lines=15):
    try:
        text = Path(path).read_text(encoding="utf-8", errors="replace")
    except OSError:
        return ""
    return "\n".join(text.strip().splitlines()[-lines:])


def assign_kill_on_close_job(proc):
    """Put proc in a Windows job that kills it when this Python process exits.

    Returns the job handle (keep it alive) or None on other platforms/failure.
    """
    if sys.platform != "win32":
        return None
    import ctypes
    from ctypes import wintypes

    class BasicLimits(ctypes.Structure):
        _fields_ = [
            ("PerProcessUserTimeLimit", ctypes.c_int64),
            ("PerJobUserTimeLimit", ctypes.c_int64),
            ("LimitFlags", wintypes.DWORD),
            ("MinimumWorkingSetSize", ctypes.c_size_t),
            ("MaximumWorkingSetSize", ctypes.c_size_t),
            ("ActiveProcessLimit", wintypes.DWORD),
            ("Affinity", ctypes.c_size_t),
            ("PriorityClass", wintypes.DWORD),
            ("SchedulingClass", wintypes.DWORD),
        ]

    class IoCounters(ctypes.Structure):
        _fields_ = [
            (name, ctypes.c_uint64)
            for name in (
                "ReadOperationCount",
                "WriteOperationCount",
                "OtherOperationCount",
                "ReadTransferCount",
                "WriteTransferCount",
                "OtherTransferCount",
            )
        ]

    class ExtendedLimits(ctypes.Structure):
        _fields_ = [
            ("BasicLimitInformation", BasicLimits),
            ("IoInfo", IoCounters),
            ("ProcessMemoryLimit", ctypes.c_size_t),
            ("JobMemoryLimit", ctypes.c_size_t),
            ("PeakProcessMemoryUsed", ctypes.c_size_t),
            ("PeakJobMemoryUsed", ctypes.c_size_t),
        ]

    job_object_limit_kill_on_job_close = 0x2000
    job_object_extended_limit_information = 9

    kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
    kernel32.CreateJobObjectW.restype = wintypes.HANDLE
    kernel32.CreateJobObjectW.argtypes = [ctypes.c_void_p, wintypes.LPCWSTR]
    kernel32.SetInformationJobObject.argtypes = [wintypes.HANDLE, ctypes.c_int, ctypes.c_void_p, wintypes.DWORD]
    kernel32.AssignProcessToJobObject.argtypes = [wintypes.HANDLE, wintypes.HANDLE]

    job = kernel32.CreateJobObjectW(None, None)
    if not job:
        return None
    info = ExtendedLimits()
    info.BasicLimitInformation.LimitFlags = job_object_limit_kill_on_job_close
    if not kernel32.SetInformationJobObject(
        job, job_object_extended_limit_information, ctypes.byref(info), ctypes.sizeof(info)
    ):
        close_job(job)
        return None
    if not kernel32.AssignProcessToJobObject(job, int(proc._handle)):
        close_job(job)
        return None
    return job


def close_job(job):
    if job and sys.platform == "win32":
        import ctypes

        ctypes.WinDLL("kernel32").CloseHandle(ctypes.c_void_p(job))


def _terminate(proc):
    if proc.poll() is None:
        proc.terminate()
        try:
            proc.wait(timeout=10)
        except subprocess.TimeoutExpired:
            proc.kill()
            proc.wait()


class ModelManager:
    """Runs one llama-server process: stopped -> starting -> ready, or error."""

    def __init__(self, build_command, port, log_path, health_timeout=180.0):
        self._build_command = build_command
        self.port = port
        self.log_path = Path(log_path)
        self.health_timeout = health_timeout
        self._lock = threading.Lock()
        self._proc = None
        self._job = None
        self._log_file = None
        self._state = "stopped"
        self._error = None

    def status(self):
        with self._lock:
            return {"state": self._state, "error": self._error}

    def pid(self):
        with self._lock:
            return self._proc.pid if self._proc else None

    def start(self):
        with self._lock:
            if self._state in ("starting", "ready"):
                return
            self.log_path.parent.mkdir(parents=True, exist_ok=True)
            self._log_file = open(self.log_path, "wb")
            flags = subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0
            try:
                proc = subprocess.Popen(
                    self._build_command(),
                    stdout=self._log_file,
                    stderr=subprocess.STDOUT,
                    stdin=subprocess.DEVNULL,
                    creationflags=flags,
                )
            except OSError as exc:
                self._log_file.close()
                self._log_file = None
                self._state = "error"
                self._error = f"Could not start the model: {exc}"
                return
            self._proc = proc
            self._job = assign_kill_on_close_job(proc)
            self._state = "starting"
            self._error = None
        threading.Thread(target=self._wait_until_ready, args=(proc,), daemon=True).start()

    def _wait_until_ready(self, proc):
        deadline = time.monotonic() + self.health_timeout
        url = f"http://127.0.0.1:{self.port}/health"
        while time.monotonic() < deadline:
            if proc.poll() is not None:
                self._fail(proc, f"The model stopped while loading (exit code {proc.returncode}).")
                return
            try:
                with _OPENER.open(url, timeout=2) as response:
                    if response.status == 200:
                        with self._lock:
                            if self._proc is proc:
                                self._state = "ready"
                        return
            except (urllib.error.URLError, OSError):
                pass  # not listening yet, or 503 while the model loads
            time.sleep(0.3)
        self._fail(proc, f"The model did not become ready within {int(self.health_timeout)} seconds.")

    def _fail(self, proc, message):
        with self._lock:
            if self._proc is not proc:
                return  # stopped or restarted meanwhile
            self._proc = None
            job, self._job = self._job, None
            self._state = "error"
        _terminate(proc)
        log = tail_file(self.log_path)
        with self._lock:
            self._error = f"{message}\n{log}".strip()
        self._close_log()
        close_job(job)

    def stop(self):
        with self._lock:
            proc, self._proc = self._proc, None
            job, self._job = self._job, None
            self._state = "stopped"
            self._error = None
        if proc:
            _terminate(proc)
        self._close_log()
        close_job(job)

    def _close_log(self):
        with self._lock:
            log_file, self._log_file = self._log_file, None
        if log_file:
            log_file.close()
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `python -m unittest discover -s tests -v`
Expected: all tests `ok` (17 total). The job test takes a few seconds.

- [ ] **Step 7: Commit**

```bash
git add Rubric_Marking_Tool_Advanced/server.py Rubric_Marking_Tool_Advanced/tests/fake_llama_server.py Rubric_Marking_Tool_Advanced/tests/job_parent.py Rubric_Marking_Tool_Advanced/tests/test_model_manager.py
git commit -m "feat(advanced): model manager with kill-on-close job object

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 9: Advanced — App, HTTP handler, chat proxy (TDD)

**Files:**
- Create: `Rubric_Marking_Tool_Advanced/tests/test_http.py`
- Modify: `Rubric_Marking_Tool_Advanced/server.py`

- [ ] **Step 1: Write the failing tests `tests/test_http.py`**

```python
import http.client
import json
import tempfile
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import support
import server


class FakeUpstream:
    """An OpenAI-style endpoint standing in for tele_ai / Unsloth / llama-server."""

    def __init__(self):
        received = self.received = []

        class Handler(BaseHTTPRequestHandler):
            def log_message(self, *_):
                pass

            def do_POST(self):
                length = int(self.headers.get("Content-Length") or 0)
                received.append((self.path, json.loads(self.rfile.read(length))))
                data = json.dumps({"choices": [{"message": {"content": "Upstream reply"}}]}).encode()
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(data)))
                self.end_headers()
                self.wfile.write(data)

        self.httpd = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        self.port = self.httpd.server_address[1]
        threading.Thread(target=self.httpd.serve_forever, daemon=True).start()

    def close(self):
        self.httpd.shutdown()
        self.httpd.server_close()


class HttpTests(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.root = Path(tmp.name) / "advanced"
        self.standard = Path(tmp.name) / "standard"
        self.web = self.root / "web"
        self.standard.mkdir(parents=True)
        self.web.mkdir(parents=True)
        (self.standard / "index.html").write_text("<html><head></head><body></body></html>", encoding="utf-8")
        (self.standard / "styles.css").write_text("body{}", encoding="utf-8")
        (self.web / "advanced-ai.js").write_text("// panel", encoding="utf-8")
        (Path(tmp.name) / "secret.txt").write_text("secret", encoding="utf-8")

        self.model_port = support.free_port()
        config = dict(server.DEFAULT_CONFIG, model_port=self.model_port)
        manager = server.ModelManager(
            support.fake_command(self.model_port), self.model_port, self.root / "logs" / "llama-server.log"
        )
        self.app = server.App(config, self.root, self.standard, self.web, manager=manager)
        self.httpd = server.make_server(self.app, 0)
        self.port = self.httpd.server_address[1]
        threading.Thread(target=self.httpd.serve_forever, daemon=True).start()
        self.addCleanup(self.app.manager.stop)
        self.addCleanup(self.httpd.server_close)
        self.addCleanup(self.httpd.shutdown)

    def request(self, method, path, body=None, headers=None):
        conn = http.client.HTTPConnection("127.0.0.1", self.port, timeout=20)
        data = None if body is None else json.dumps(body).encode()
        all_headers = {"Content-Type": "application/json"} if data is not None else {}
        all_headers.update(headers or {})
        conn.request(method, path, body=data, headers=all_headers)
        response = conn.getresponse()
        result = (response.status, response.getheader("Content-Type"), response.read())
        conn.close()
        return result

    def post_json(self, path, body=None, headers=None):
        status, _, data = self.request("POST", path, body if body is not None else {}, headers)
        return status, json.loads(data)

    def create_fake_install(self):
        exe = self.root / "bin" / "llama.cpp" / "llama-server.exe"
        exe.parent.mkdir(parents=True)
        exe.write_bytes(b"")
        model = self.root / "models" / server.DEFAULT_CONFIG["model_file"]
        model.parent.mkdir(parents=True)
        model.write_bytes(b"")

    # --- static serving ---

    def test_index_is_served_with_advanced_panel_injected(self):
        for path in ("/", "/index.html"):
            status, ctype, body = self.request("GET", path)
            self.assertEqual(status, 200)
            self.assertTrue(ctype.startswith("text/html"))
            self.assertIn(b'/advanced/advanced-ai.js', body)
            self.assertIn(b'/advanced/advanced-ai.css', body)

    def test_standard_files_are_served(self):
        status, ctype, body = self.request("GET", "/styles.css?v=1")
        self.assertEqual((status, body), (200, b"body{}"))
        self.assertTrue(ctype.startswith("text/css"))

    def test_advanced_files_are_served(self):
        status, ctype, body = self.request("GET", "/advanced/advanced-ai.js")
        self.assertEqual((status, body), (200, b"// panel"))
        self.assertTrue(ctype.startswith("text/javascript"))

    def test_traversal_is_rejected(self):
        for path in ("/../secret.txt", "/%2e%2e/secret.txt", "/advanced/../../secret.txt"):
            self.assertEqual(self.request("GET", path)[0], 404, path)

    # --- model API ---

    def test_status_starts_stopped_with_model_name(self):
        status, _, body = self.request("GET", "/api/model/status")
        self.assertEqual(status, 200)
        self.assertEqual(
            json.loads(body), {"state": "stopped", "error": None, "model": server.DEFAULT_CONFIG["model_file"]}
        )

    def test_start_without_llama_server_explains_setup(self):
        status, body = self.post_json("/api/model/start")
        self.assertEqual(status, 200)
        self.assertEqual(body["state"], "error")
        self.assertIn("llama-server.exe not found", body["error"])
        self.assertIn("setup.bat", body["error"])

    def test_start_without_model_explains_setup(self):
        exe = self.root / "bin" / "llama.cpp" / "llama-server.exe"
        exe.parent.mkdir(parents=True)
        exe.write_bytes(b"")
        status, body = self.post_json("/api/model/start")
        self.assertEqual(body["state"], "error")
        self.assertIn("Model file not found", body["error"])

    def test_start_and_stop_through_the_api(self):
        self.create_fake_install()
        status, body = self.post_json("/api/model/start")
        self.assertEqual(body["state"], "starting")
        status, body = self.post_json("/api/model/stop")
        self.assertEqual(body["state"], "stopped")

    def test_foreign_origin_is_refused(self):
        status, body = self.post_json("/api/model/start", headers={"Origin": "https://evil.example"})
        self.assertEqual(status, 403)

    def test_own_origin_is_allowed(self):
        status, _ = self.post_json("/api/model/stop", headers={"Origin": f"http://127.0.0.1:{self.port}"})
        self.assertEqual(status, 200)

    def test_post_without_json_content_type_is_refused(self):
        status, _, _ = self.request("POST", "/api/model/stop", headers={"Content-Type": "text/plain"})
        self.assertEqual(status, 415)

    # --- chat proxy ---

    def test_chat_requires_payload(self):
        status, body = self.post_json("/api/chat", {"target": "builtin"})
        self.assertEqual(status, 400)
        self.assertIn("payload", body["error"])

    def test_chat_builtin_requires_running_model(self):
        status, body = self.post_json("/api/chat", {"target": "builtin", "payload": {"messages": []}})
        self.assertEqual(status, 409)
        self.assertIn("Start", body["error"])

    def test_chat_custom_requires_http_url(self):
        status, body = self.post_json("/api/chat", {"target": "custom", "endpoint": "ftp://x", "payload": {}})
        self.assertEqual(status, 400)

    def test_chat_custom_forwards_to_endpoint(self):
        upstream = FakeUpstream()
        self.addCleanup(upstream.close)
        payload = {"model": "m", "messages": [{"role": "user", "content": "hi"}]}
        status, body = self.post_json(
            "/api/chat",
            {"target": "custom", "endpoint": f"http://127.0.0.1:{upstream.port}/v1/chat/completions", "payload": payload},
        )
        self.assertEqual(status, 200)
        self.assertEqual(body["choices"][0]["message"]["content"], "Upstream reply")
        self.assertEqual(upstream.received, [("/v1/chat/completions", payload)])

    def test_chat_custom_unreachable_is_502(self):
        dead_port = support.free_port()
        status, body = self.post_json(
            "/api/chat",
            {"target": "custom", "endpoint": f"http://127.0.0.1:{dead_port}/v1/chat/completions", "payload": {}},
        )
        self.assertEqual(status, 502)
        self.assertIn("Could not reach", body["error"])

    def test_chat_builtin_forwards_when_ready(self):
        self.create_fake_install()
        self.post_json("/api/model/start")
        import time

        deadline = time.monotonic() + 15
        while self.app.manager.status()["state"] != "ready" and time.monotonic() < deadline:
            time.sleep(0.1)
        status, body = self.post_json(
            "/api/chat", {"target": "builtin", "payload": {"messages": [{"role": "user", "content": "x"}]}}
        )
        self.assertEqual(status, 200)
        self.assertEqual(body["choices"][0]["message"]["content"], "Fake comment (1 messages)")

    # --- ports ---

    def test_second_server_on_same_port_fails(self):
        with self.assertRaises(OSError):
            server.make_server(self.app, self.port)


class BuildCommandTests(unittest.TestCase):
    def test_command_uses_config(self):
        root = Path("C:/tool")
        config = dict(server.DEFAULT_CONFIG, threads=4)
        app = server.App(config, root, root / "std", root / "web")
        cmd = app.build_llama_command()
        self.assertEqual(cmd[0], str(root / "bin" / "llama.cpp" / "llama-server.exe"))
        for pair in (
            ["-m", str(root / "models" / config["model_file"])],
            ["--host", "127.0.0.1"],
            ["--port", "8766"],
            ["-c", "4096"],
            ["--reasoning", "off"],
            ["-t", "4"],
        ):
            index = cmd.index(pair[0])
            self.assertEqual(cmd[index : index + 2], pair)
        self.assertIn("--no-webui", cmd)

    def test_threads_zero_is_omitted(self):
        root = Path("C:/tool")
        app = server.App(dict(server.DEFAULT_CONFIG), root, root / "std", root / "web")
        self.assertNotIn("-t", app.build_llama_command())


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `python -m unittest discover -s tests -v`
Expected: `test_http` errors with `AttributeError: module 'server' has no attribute 'App'`.

- [ ] **Step 3: Add the implementation to `server.py`**

Add to the import block (keep alphabetical order):

```python
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote, urlsplit
```

Add these constants directly below `INJECT_BODY`:

```python
CONTENT_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
}
CHAT_TIMEOUT = 300
MAX_BODY = 1_000_000
```

Append to the end of `server.py`:

```python
def _json_bytes(obj):
    return json.dumps(obj).encode("utf-8")


class App:
    """Everything the HTTP handler needs: paths, config and the model manager."""

    def __init__(self, config, root, standard_dir, web_dir, manager=None):
        self.config = config
        self.root = Path(root)
        self.standard_dir = Path(standard_dir)
        self.web_dir = Path(web_dir)
        self.llama_exe = self.root / "bin" / "llama.cpp" / "llama-server.exe"
        self.model_path = resolve_model_path(config, self.root)
        self.manager = manager or ModelManager(
            self.build_llama_command, config["model_port"], self.root / "logs" / "llama-server.log"
        )

    def build_llama_command(self):
        cmd = [
            str(self.llama_exe),
            "-m", str(self.model_path),
            "--host", "127.0.0.1",
            "--port", str(self.config["model_port"]),
            "-c", str(self.config["context_size"]),
            "--reasoning", "off",
            "--no-webui",
        ]
        threads = int(self.config.get("threads") or 0)
        if threads > 0:
            cmd += ["-t", str(threads)]
        return cmd

    def model_status(self):
        return {**self.manager.status(), "model": self.model_path.name}

    def start_model(self):
        if not self.llama_exe.is_file():
            return {
                "state": "error",
                "model": self.model_path.name,
                "error": f"llama-server.exe not found at {self.llama_exe}. Run setup.bat first.",
            }
        if not self.model_path.is_file():
            return {
                "state": "error",
                "model": self.model_path.name,
                "error": f"Model file not found at {self.model_path}. Run setup.bat, or fix model_path in config.json.",
            }
        self.manager.start()
        return self.model_status()

    def chat(self, body):
        """Forward a chat payload. Returns (http_status, response_bytes)."""
        payload = body.get("payload")
        if not isinstance(payload, dict):
            return 400, _json_bytes({"error": "Missing chat payload."})
        target = body.get("target")
        if target == "builtin":
            if self.manager.status()["state"] != "ready":
                return 409, _json_bytes({"error": "The built-in model is not running. Click Start first."})
            url = f"http://127.0.0.1:{self.config['model_port']}/v1/chat/completions"
        elif target == "custom":
            url = str(body.get("endpoint") or "").strip()
            if not url.startswith(("http://", "https://")):
                return 400, _json_bytes({"error": "Enter an endpoint URL starting with http:// or https://."})
        else:
            return 400, _json_bytes({"error": "Unknown AI source."})

        request = urllib.request.Request(
            url, data=_json_bytes(payload), headers={"Content-Type": "application/json"}, method="POST"
        )
        try:
            with _OPENER.open(request, timeout=CHAT_TIMEOUT) as response:
                return response.status, response.read()
        except urllib.error.HTTPError as exc:
            return exc.code, exc.read() or _json_bytes({"error": f"{url} returned {exc.code}."})
        except (urllib.error.URLError, OSError) as exc:
            reason = getattr(exc, "reason", exc)
            return 502, _json_bytes({"error": f"Could not reach {url}: {reason}"})


class Handler(BaseHTTPRequestHandler):
    server_version = "RubricAdvanced/1.0"

    def log_message(self, *_):
        pass  # keep the console window readable

    @property
    def app(self):
        return self.server.app

    def _send(self, status, data, content_type):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def _send_json(self, status, obj):
        self._send(status, _json_bytes(obj), "application/json")

    def _not_found(self):
        self._send(404, b"Not found", "text/plain; charset=utf-8")

    def do_GET(self):
        path = unquote(urlsplit(self.path).path)
        if path == "/api/model/status":
            return self._send_json(200, self.app.model_status())
        if path in ("/", "/index.html"):
            page = resolve_static(self.app.standard_dir, "index.html")
            if not page:
                return self._not_found()
            html = inject_advanced(page.read_text(encoding="utf-8"))
            return self._send(200, html.encode("utf-8"), CONTENT_TYPES[".html"])
        if path.startswith("/advanced/"):
            file = resolve_static(self.app.web_dir, path[len("/advanced/"):])
        else:
            file = resolve_static(self.app.standard_dir, path.lstrip("/"))
        if not file:
            return self._not_found()
        self._send(200, file.read_bytes(), CONTENT_TYPES.get(file.suffix.lower(), "application/octet-stream"))

    def _origin_ok(self):
        # Browsers always send Origin on cross-site POSTs; refuse anything that isn't this page.
        origin = self.headers.get("Origin")
        port = self.server.server_address[1]
        return origin is None or origin in (f"http://127.0.0.1:{port}", f"http://localhost:{port}")

    def do_POST(self):
        path = urlsplit(self.path).path
        if not self._origin_ok():
            return self._send_json(403, {"error": "Requests from other websites are not allowed."})
        if not (self.headers.get("Content-Type") or "").startswith("application/json"):
            return self._send_json(415, {"error": "Expected a JSON request."})
        length = min(int(self.headers.get("Content-Length") or 0), MAX_BODY)
        raw = self.rfile.read(length) if length else b""

        if path == "/api/model/start":
            return self._send_json(200, self.app.start_model())
        if path == "/api/model/stop":
            self.app.manager.stop()
            return self._send_json(200, self.app.model_status())
        if path == "/api/chat":
            try:
                body = json.loads(raw or b"{}")
            except json.JSONDecodeError:
                return self._send_json(400, {"error": "Request body was not valid JSON."})
            if not isinstance(body, dict):
                return self._send_json(400, {"error": "Request body must be a JSON object."})
            status, data = self.app.chat(body)
            return self._send(status, data, "application/json")
        self._not_found()


class AdvancedServer(ThreadingHTTPServer):
    # ThreadingHTTPServer defaults to SO_REUSEADDR, which on Windows lets a second
    # copy silently share the port. Turn it off so a second launch fails cleanly.
    allow_reuse_address = False
    daemon_threads = True


def make_server(app, port):
    httpd = AdvancedServer(("127.0.0.1", port), Handler)
    httpd.app = app
    return httpd
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `python -m unittest discover -s tests -v`
Expected: all tests `ok`.

- [ ] **Step 5: Commit**

```bash
git add Rubric_Marking_Tool_Advanced/server.py Rubric_Marking_Tool_Advanced/tests/test_http.py
git commit -m "feat(advanced): HTTP server with model API and chat proxy

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 10: Advanced — entry point and launcher

**Files:**
- Modify: `Rubric_Marking_Tool_Advanced/server.py`
- Create: `Rubric_Marking_Tool_Advanced/Open Advanced Marking Tool.bat`

- [ ] **Step 1: Add to the import block of `server.py`**

```python
import argparse
import webbrowser
```

- [ ] **Step 2: Append `main()` to `server.py`**

```python
def main(argv=None):
    parser = argparse.ArgumentParser(description="Advanced Rubric Marking Tool")
    parser.add_argument("--no-browser", action="store_true", help="don't open the browser")
    args = parser.parse_args(argv)

    config = load_config(ROOT / "config.json")
    app = App(config, ROOT, ROOT.parent / "Rubric_Marking_Tool" / "program", ROOT / "web")
    url = f"http://127.0.0.1:{config['ui_port']}/"

    if not (app.standard_dir / "index.html").is_file():
        print(f"Could not find the standard marking tool at {app.standard_dir}")
        print("Keep this folder next to the Rubric_Marking_Tool folder.")
        return 1

    try:
        httpd = make_server(app, config["ui_port"])
    except OSError:
        print(f"Port {config['ui_port']} is already in use - the Advanced Marking Tool is probably already open.")
        print(f"Opening {url}")
        if not args.no_browser:
            webbrowser.open(url)
        return 2

    print("Advanced Rubric Marking Tool")
    print(f"  Open in your browser: {url}")
    print(f"  Built-in model: {app.model_path}")
    print("  Close this window (or press Ctrl+C) to stop the tool and the model.")
    if not args.no_browser:
        webbrowser.open(url)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        app.manager.stop()
        httpd.server_close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 3: Create `Open Advanced Marking Tool.bat`**

```bat
@echo off
setlocal
cd /d "%~dp0"
set "STD=..\Rubric_Marking_Tool\program"

if not exist "%STD%\index.html" (
  echo Could not find the standard marking tool at %STD%
  echo Keep this folder next to the Rubric_Marking_Tool folder.
  pause
  exit /b 1
)

(for %%f in ("%STD%\datasets\data*.js") do type "%%f") > "%STD%\datasets\_all.js"

if not exist "bin\python\python.exe" (
  echo Portable Python is missing. Run setup.bat first.
  pause
  exit /b 1
)

title Advanced Rubric Marking Tool - close this window to stop
"bin\python\python.exe" server.py
pause
```

- [ ] **Step 4: Smoke-test the entry point with system Python**

Run (from `Rubric_Marking_Tool_Advanced/`, background): `python server.py --no-browser`
Then: `curl -s http://127.0.0.1:8765/api/model/status` → `{"state": "stopped", "error": null, "model": "gemma-4-E2B-it-Q4_K_M.gguf"}`
Then: `curl -s http://127.0.0.1:8765/ | grep advanced-ai` → two lines (css + js).
Then run `python server.py --no-browser` a second time → prints "Port 8765 is already in use…" and exits with code 2.
Stop the first server (stop the background task).

- [ ] **Step 5: Run the full suite, then commit**

Run: `python -m unittest discover -s tests -v` → all `ok`.

```bash
git add Rubric_Marking_Tool_Advanced/server.py "Rubric_Marking_Tool_Advanced/Open Advanced Marking Tool.bat"
git commit -m "feat(advanced): server entry point and launcher

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 11: Advanced — AI panel (`advanced-ai.js` / `.css`)

**Files:**
- Create: `Rubric_Marking_Tool_Advanced/web/advanced-ai.js`
- Create: `Rubric_Marking_Tool_Advanced/web/advanced-ai.css`

- [ ] **Step 1: Create `web/advanced-ai.js`**

```js
// Advanced AI panel. server.py injects this after the standard tool's app.js; the standard
// tool never loads it. Uses the standard tool's globals: buildAiPrompt(), setAiStatus(), els.
(function () {
  "use strict";

  const slot = document.querySelector("#aiSlot");
  if (!slot) return;

  const STORAGE_KEY = "advancedAiSettings";
  const DEFAULTS = { source: "builtin", endpoint: "http://127.0.0.1:8080/v1/chat/completions", model: "local-model" };
  const SYSTEM_PROMPT =
    "You write clear, specific Australian high school science feedback. Follow the user's constraints exactly.";
  const STATE_LABELS = { stopped: "Stopped", starting: "Loading model…", ready: "Ready", error: "Error" };

  function loadSettings() {
    try {
      return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") };
    } catch {
      return { ...DEFAULTS };
    }
  }

  function saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // storage unavailable: settings last for this visit only
    }
  }

  const settings = loadSettings();

  slot.innerHTML = `
    <div class="adv-ai">
      <div class="adv-source" role="radiogroup" aria-label="AI source">
        <label><input type="radio" name="advSource" value="builtin"> Built-in model</label>
        <label><input type="radio" name="advSource" value="custom"> Custom endpoint</label>
      </div>
      <div class="adv-builtin">
        <div class="adv-model-row">
          <span class="adv-dot" data-state="stopped"></span>
          <span class="adv-model-text">Checking…</span>
          <button type="button" class="adv-toggle">Start</button>
        </div>
      </div>
      <div class="adv-custom" hidden>
        <label><span>Endpoint</span><input class="adv-endpoint" type="url"></label>
        <label><span>Model name</span><input class="adv-model" type="text"></label>
      </div>
      <button type="button" class="adv-generate">Generate with AI</button>
    </div>`;

  const ui = {
    radios: slot.querySelectorAll('input[name="advSource"]'),
    builtin: slot.querySelector(".adv-builtin"),
    custom: slot.querySelector(".adv-custom"),
    dot: slot.querySelector(".adv-dot"),
    text: slot.querySelector(".adv-model-text"),
    toggle: slot.querySelector(".adv-toggle"),
    endpoint: slot.querySelector(".adv-endpoint"),
    model: slot.querySelector(".adv-model"),
    generate: slot.querySelector(".adv-generate"),
  };

  let pollTimer = null;
  let lastState = null;

  function showSource() {
    ui.radios.forEach((radio) => {
      radio.checked = radio.value === settings.source;
    });
    ui.builtin.hidden = settings.source !== "builtin";
    ui.custom.hidden = settings.source !== "custom";
  }

  function renderStatus(status) {
    const state = status.state;
    ui.dot.dataset.state = state;
    ui.text.textContent = `${STATE_LABELS[state] || state}${status.model ? ` · ${status.model}` : ""}`;
    ui.toggle.textContent = state === "ready" || state === "starting" ? "Stop" : "Start";
    if (state === "error" && status.error) setAiStatus(status.error, "error");
    if (state === "ready" && lastState === "starting") setAiStatus("Built-in model ready.");
    lastState = state;
    clearTimeout(pollTimer);
    if (state === "starting") pollTimer = setTimeout(refreshStatus, 1500);
  }

  async function postJson(path, body = {}) {
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    return { response, data };
  }

  async function refreshStatus() {
    try {
      const response = await fetch("/api/model/status");
      renderStatus(await response.json());
    } catch {
      renderStatus({ state: "error", error: "Lost contact with the Advanced server. Is its window still open?" });
    }
  }

  async function toggleModel() {
    const running = ui.dot.dataset.state === "ready" || ui.dot.dataset.state === "starting";
    ui.toggle.disabled = true;
    setAiStatus(running ? "Stopping the built-in model…" : "Starting the built-in model…", "working");
    try {
      const { data } = await postJson(running ? "/api/model/stop" : "/api/model/start");
      if (running) setAiStatus("Built-in model stopped.");
      else if (data.state === "starting") setAiStatus("Loading the model - this can take up to a minute.", "working");
      renderStatus(data);
    } catch {
      setAiStatus("Lost contact with the Advanced server. Is its window still open?", "error");
    } finally {
      ui.toggle.disabled = false;
    }
  }

  function cleanComment(text) {
    return String(text || "")
      .replace(/<think>[\s\S]*?<\/think>/gi, "")
      .replace(/<\|[^|>]*\|>/g, "")
      .replace(/^\s*(feedback comment:|comment:)\s*/i, "")
      .trim();
  }

  function errorMessage(data, response) {
    if (typeof data.error === "string") return data.error;
    if (data.error?.message) return data.error.message;
    return `The AI server returned ${response.status}.`;
  }

  async function generate() {
    const prompt = buildAiPrompt();
    if (!prompt) {
      setAiStatus("Select rubric criteria and choose at least one matching descriptor first.", "error");
      return;
    }
    const body = {
      target: settings.source,
      endpoint: settings.endpoint,
      payload: {
        model: settings.source === "custom" ? settings.model : "builtin",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        temperature: 0.55,
        top_p: 0.9,
        max_tokens: 450,
        stream: false,
        chat_template_kwargs: { enable_thinking: false },
      },
    };

    ui.generate.disabled = true;
    setAiStatus("Writing the comment…", "working");
    try {
      const { response, data } = await postJson("/api/chat", body);
      if (!response.ok) throw new Error(errorMessage(data, response));
      const content = cleanComment(data?.choices?.[0]?.message?.content || data?.choices?.[0]?.text);
      if (!content) throw new Error("The model returned an empty response.");
      els.commentOutput.value = content;
      setAiStatus("AI comment generated. Edit it freely before using it.");
    } catch (error) {
      setAiStatus(error.message || "Could not generate a comment.", "error");
    } finally {
      ui.generate.disabled = false;
    }
  }

  ui.radios.forEach((radio) =>
    radio.addEventListener("change", () => {
      settings.source = radio.value;
      saveSettings();
      showSource();
    })
  );
  ui.endpoint.value = settings.endpoint;
  ui.model.value = settings.model;
  ui.endpoint.addEventListener("change", () => {
    settings.endpoint = ui.endpoint.value.trim() || DEFAULTS.endpoint;
    saveSettings();
  });
  ui.model.addEventListener("change", () => {
    settings.model = ui.model.value.trim() || DEFAULTS.model;
    saveSettings();
  });
  ui.toggle.addEventListener("click", toggleModel);
  ui.generate.addEventListener("click", generate);

  showSource();
  refreshStatus();
})();
```

- [ ] **Step 2: Create `web/advanced-ai.css`**

```css
.adv-ai {
  display: grid;
  gap: 10px;
}

.adv-source {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
}

.adv-source label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
}

.adv-model-row {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--muted);
  font-size: 13px;
}

.adv-model-text {
  flex: 1;
  min-width: 0;
  overflow-wrap: anywhere;
}

.adv-dot {
  flex: none;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--line);
}

.adv-dot[data-state="starting"] {
  background: var(--gold);
}

.adv-dot[data-state="ready"] {
  background: var(--accent);
}

.adv-dot[data-state="error"] {
  background: var(--danger);
}

.adv-custom {
  display: grid;
  gap: 10px;
}

.adv-custom[hidden],
.adv-builtin[hidden] {
  display: none;
}

.adv-generate {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}

.adv-generate:disabled,
.adv-toggle:disabled {
  cursor: wait;
  opacity: 0.6;
}

@media print {
  .adv-ai {
    display: none !important;
  }
}
```

- [ ] **Step 3: Verify the panel in the browser (no model needed)**

1. Start the server with system Python in the background: `python server.py --no-browser` (from `Rubric_Marking_Tool_Advanced/`).
2. Navigate the built-in browser to `http://127.0.0.1:8765/`. `read_console_messages` `onlyErrors: true` → none.
3. Comment tab: panel shows "Built-in model / Custom endpoint", status "Stopped · gemma-4-E2B-it-Q4_K_M.gguf", Start button, Generate with AI, Copy AI Prompt.
4. Click Start (no `bin/` yet) → status line shows "llama-server.exe not found at … Run setup.bat first." and the dot is red.
5. Select Custom endpoint → endpoint/model fields appear; reload page → Custom is still selected (localStorage).
6. Custom endpoint test: start `python tests/fake_llama_server.py --port 8767` in the background, set endpoint to `http://127.0.0.1:8767/v1/chat/completions`, mark one criterion, click Generate with AI → comment box reads `Fake comment (2 messages)`.
7. Click Generate with nothing marked (Clear first) → "Select rubric criteria…" error.
8. Screenshot as proof. Stop both background servers. Switch the panel back to Built-in model.

- [ ] **Step 4: Commit**

```bash
git add Rubric_Marking_Tool_Advanced/web/advanced-ai.js Rubric_Marking_Tool_Advanced/web/advanced-ai.css
git commit -m "feat(advanced): AI panel with built-in model and custom endpoint

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 12: Advanced — setup (`setup_helper.py` TDD + `setup.bat`)

**Files:**
- Create: `Rubric_Marking_Tool_Advanced/tests/test_setup_helper.py`
- Create: `Rubric_Marking_Tool_Advanced/setup_helper.py`
- Create: `Rubric_Marking_Tool_Advanced/setup.bat`

- [ ] **Step 1: Write the failing tests `tests/test_setup_helper.py`**

```python
import tempfile
import unittest
from pathlib import Path

import support  # noqa: F401
import setup_helper

RELEASES = [
    {"tag_name": "b3", "assets": [{"name": "llama-b3-bin-macos-arm64.tar.gz", "browser_download_url": "u-mac"}]},
    {
        "tag_name": "b2",
        "assets": [
            {"name": "cudart-llama-bin-win-cuda-12.4-x64.zip", "browser_download_url": "u-cudart"},
            {"name": "llama-b2-bin-win-cpu-arm64.zip", "browser_download_url": "u-arm"},
            {"name": "llama-b2-bin-win-cpu-x64.zip", "browser_download_url": "u-cpu"},
        ],
    },
    {"tag_name": "b1", "assets": [{"name": "llama-b1-bin-win-cpu-x64.zip", "browser_download_url": "u-old"}]},
]


class PickLlamaAssetTests(unittest.TestCase):
    def test_picks_newest_release_with_windows_cpu_x64_build(self):
        self.assertEqual(setup_helper.pick_llama_asset(RELEASES), ("b2", "u-cpu"))

    def test_none_when_no_matching_asset(self):
        self.assertIsNone(setup_helper.pick_llama_asset(RELEASES[:1]))
        self.assertIsNone(setup_helper.pick_llama_asset([]))


class FindFileSizeTests(unittest.TestCase):
    TREE = [
        {"type": "file", "path": "README.md", "size": 10},
        {"type": "file", "path": "gemma-4-E2B-it-Q4_K_M.gguf", "size": 3106738272},
    ]

    def test_finds_size(self):
        self.assertEqual(setup_helper.find_file_size(self.TREE, "gemma-4-E2B-it-Q4_K_M.gguf"), 3106738272)

    def test_missing_is_none(self):
        self.assertIsNone(setup_helper.find_file_size(self.TREE, "other.gguf"))


class NeedsDownloadTests(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.file = Path(tmp.name) / "model.gguf"

    def test_missing_file_needs_download(self):
        self.assertTrue(setup_helper.needs_download(self.file, 5))

    def test_wrong_size_needs_download(self):
        self.file.write_bytes(b"abc")
        self.assertTrue(setup_helper.needs_download(self.file, 5))

    def test_matching_size_is_current(self):
        self.file.write_bytes(b"abcde")
        self.assertFalse(setup_helper.needs_download(self.file, 5))

    def test_unknown_size_trusts_existing_file(self):
        self.file.write_bytes(b"abc")
        self.assertFalse(setup_helper.needs_download(self.file, None))


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `python -m unittest discover -s tests -v`
Expected: `ModuleNotFoundError: No module named 'setup_helper'`.

- [ ] **Step 3: Create `setup_helper.py`**

```python
"""Downloads or updates llama.cpp and the model for the Advanced Marking Tool.

Run by setup.bat using the portable Python. Standard library only. Only
downloads what is missing or out of date.
"""
import json
import shutil
import sys
import urllib.error
import urllib.request
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))  # the embeddable Python doesn't add the script folder
from server import load_config, resolve_model_path  # noqa: E402

BIN = ROOT / "bin"
LLAMA_DIR = BIN / "llama.cpp"
VERSION_FILE = LLAMA_DIR / "VERSION"
# llama.cpp marks its builds as prereleases, so /releases/latest is wrong; scan the list.
RELEASES_API = "https://api.github.com/repos/ggml-org/llama.cpp/releases?per_page=20"
ASSET_SUFFIX = "-bin-win-cpu-x64.zip"
HEADERS = {"User-Agent": "rubric-marking-tool-setup"}


def pick_llama_asset(releases):
    """Return (tag, download_url) of the newest Windows CPU x64 build, or None."""
    for release in releases:
        for asset in release.get("assets", []):
            name = asset.get("name", "")
            if name.startswith("llama-") and name.endswith(ASSET_SUFFIX):
                return release["tag_name"], asset["browser_download_url"]
    return None


def find_file_size(tree, filename):
    for entry in tree:
        if entry.get("path") == filename:
            return entry.get("size")
    return None


def needs_download(path, expected_size):
    if not path.is_file():
        return True
    return expected_size is not None and path.stat().st_size != expected_size


def fetch_json(url):
    request = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.load(response)


def download(url, dest):
    """Stream url to dest via a .part file so an interrupted download never looks complete."""
    dest.parent.mkdir(parents=True, exist_ok=True)
    part = dest.with_name(dest.name + ".part")
    request = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(request, timeout=60) as response, open(part, "wb") as out:
        total = int(response.headers.get("Content-Length") or 0)
        done = 0
        while chunk := response.read(1024 * 1024):
            out.write(chunk)
            done += len(chunk)
            if total:
                print(f"\r  {done // 2**20} / {total // 2**20} MB", end="", flush=True)
    print()
    part.replace(dest)


def update_llama():
    """Returns 'updated', 'current', 'offline' or 'error'."""
    installed = VERSION_FILE.read_text().strip() if VERSION_FILE.is_file() else None
    has_exe = (LLAMA_DIR / "llama-server.exe").is_file()
    try:
        picked = pick_llama_asset(fetch_json(RELEASES_API))
    except (urllib.error.URLError, OSError, ValueError) as exc:
        if has_exe:
            print(f"[skip] llama.cpp: could not check for updates ({exc}); keeping {installed}.")
            return "offline"
        print(f"[error] llama.cpp: could not download ({exc}).")
        return "error"
    if picked is None:
        print("[error] llama.cpp: no Windows CPU build found in recent releases.")
        return "current" if has_exe else "error"

    tag, url = picked
    if has_exe and installed == tag:
        print(f"[ok] llama.cpp {tag} is up to date.")
        return "current"

    print(f"Downloading llama.cpp {tag} ...")
    zip_path = BIN / "llama.zip"
    staging = BIN / "llama.cpp.new"
    try:
        download(url, zip_path)
        shutil.rmtree(staging, ignore_errors=True)
        with zipfile.ZipFile(zip_path) as archive:
            archive.extractall(staging)
        if not (staging / "llama-server.exe").is_file():
            raise RuntimeError("llama-server.exe was not in the download")
        (staging / "VERSION").write_text(tag)
        if LLAMA_DIR.exists():
            shutil.rmtree(LLAMA_DIR)
        staging.rename(LLAMA_DIR)
    except PermissionError:
        print("[error] llama.cpp: files are in use. Close the Advanced Marking Tool window and run setup again.")
        return "error"
    except (urllib.error.URLError, OSError, zipfile.BadZipFile, RuntimeError) as exc:
        print(f"[error] llama.cpp: {exc}")
        return "error"
    finally:
        zip_path.unlink(missing_ok=True)
    print(f"[ok] llama.cpp {tag} installed.")
    return "updated"


def update_model(config):
    """Returns 'updated', 'current', 'offline' or 'error'."""
    target = resolve_model_path(config, ROOT)
    if str(config.get("model_path") or "").strip():
        if target.is_file():
            print(f"[skip] Model: using model_path from config.json ({target}).")
            return "current"
        print(f"[error] Model: model_path in config.json points to a missing file ({target}).")
        return "error"

    repo, filename = config["model_repo"], config["model_file"]
    try:
        expected = find_file_size(fetch_json(f"https://huggingface.co/api/models/{repo}/tree/main"), filename)
    except (urllib.error.URLError, OSError, ValueError) as exc:
        if target.is_file():
            print(f"[skip] Model: could not check for updates ({exc}); keeping {filename}.")
            return "offline"
        print(f"[error] Model: could not download ({exc}).")
        return "error"
    if expected is None:
        print(f"[error] Model: {filename} was not found in {repo}.")
        return "error"
    if not needs_download(target, expected):
        print(f"[ok] Model {filename} is present.")
        return "current"

    print(f"Downloading {filename} ({expected // 2**20} MB) - this takes a while ...")
    try:
        download(f"https://huggingface.co/{repo}/resolve/main/{filename}", target)
    except (urllib.error.URLError, OSError) as exc:
        print(f"[error] Model: download failed ({exc}). Run setup again to retry.")
        return "error"
    if needs_download(target, expected):
        print("[error] Model: downloaded file is the wrong size. Run setup again to retry.")
        return "error"
    print(f"[ok] Model {filename} installed.")
    return "updated"


def main():
    config = load_config(ROOT / "config.json")
    results = [update_llama(), update_model(config)]
    print()
    if "error" in results:
        print("Setup finished with errors - see above.")
        return 1
    if all(result == "current" for result in results):
        print("Everything up to date.")
    else:
        print("Setup complete. Double-click 'Open Advanced Marking Tool.bat' to start.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `python -m unittest discover -s tests -v`
Expected: all `ok`.

- [ ] **Step 5: Create `setup.bat`**

```bat
@echo off
setlocal
cd /d "%~dp0"
set "PY_VERSION=3.13.15"
set "PY_DIR=bin\python"
set "CURL=%SystemRoot%\System32\curl.exe"
set "TAR=%SystemRoot%\System32\tar.exe"

echo Advanced Marking Tool setup
echo.

if exist "%PY_DIR%\python.exe" goto :have_python
echo Downloading portable Python %PY_VERSION% ...
if not exist bin mkdir bin
"%CURL%" -fL --progress-bar -o "bin\python.zip.part" "https://www.python.org/ftp/python/%PY_VERSION%/python-%PY_VERSION%-embed-amd64.zip"
if errorlevel 1 goto :python_failed
move /y "bin\python.zip.part" "bin\python.zip" >nul
if not exist "%PY_DIR%" mkdir "%PY_DIR%"
"%TAR%" -xf "bin\python.zip" -C "%PY_DIR%"
if errorlevel 1 goto :python_failed
del "bin\python.zip"
echo [ok] Portable Python %PY_VERSION% installed.
goto :run_helper

:have_python
echo [ok] Portable Python is present.

:run_helper
"%PY_DIR%\python.exe" setup_helper.py
set "RESULT=%ERRORLEVEL%"
echo.
pause
exit /b %RESULT%

:python_failed
echo [error] Could not download portable Python. Check your internet connection and run setup again.
if exist "bin\python.zip.part" del "bin\python.zip.part"
if exist "bin\python.zip" del "bin\python.zip"
pause
exit /b 1
```

- [ ] **Step 6: Commit**

```bash
git add Rubric_Marking_Tool_Advanced/setup_helper.py Rubric_Marking_Tool_Advanced/setup.bat Rubric_Marking_Tool_Advanced/tests/test_setup_helper.py
git commit -m "feat(advanced): setup downloads portable Python, llama.cpp and model

Only downloads what is missing or out of date.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 13: Advanced — README

**Files:**
- Create: `Rubric_Marking_Tool_Advanced/README.md`

- [ ] **Step 1: Create `README.md`**

```markdown
# Advanced Rubric Marking Tool

The standard Rubric Marking Tool plus a built-in AI model that writes feedback comments on this computer. Student details never leave the machine when you use the built-in model.

This folder must sit next to the `Rubric_Marking_Tool` folder — it reuses that tool's pages and rubrics.

## First-time setup

1. Double-click `setup.bat`. It downloads, into this folder only:
   - a portable copy of Python (about 11 MB, nothing is installed on Windows)
   - llama.cpp, the program that runs the model (about 20 MB)
   - the Gemma 4 E2B model (about 3 GB)
2. Wait for "Setup complete".

Run `setup.bat` again at any time to update llama.cpp. It only downloads what is missing or out of date.

## Using it

1. Double-click `Open Advanced Marking Tool.bat`. A console window opens and the tool opens in your browser.
2. Mark a student as usual, then open the Generate Comment tab.
3. Under **Built-in model**, click **Start** and wait for **Ready** (up to a minute).
4. Click **Generate with AI**. Edit the comment as needed.
5. Close the console window when you're finished. That stops the model and frees its memory.

The model only loads when you click Start, so it uses no memory if you just want to mark.

### Using a different AI server

Choose **Custom endpoint** and enter an OpenAI-compatible chat URL, for example:

- tele_ai or another llama-server: `http://127.0.0.1:8080/v1/chat/completions`
- another computer on your network: `http://<its address>:8080/v1/chat/completions`

**Copy AI Prompt** still works for pasting into Copilot or any chatbot.

## Settings (`config.json`)

| Key | Meaning |
|---|---|
| `ui_port` | Port the tool opens on (default 8765). |
| `model_port` | Internal port for the built-in model (default 8766). |
| `model_repo`, `model_file` | Which model `setup.bat` downloads from Hugging Face. |
| `model_path` | Use a GGUF file you already have (e.g. one downloaded by Unsloth). Setup then skips the model download. Use double backslashes: `"C:\\AI_models\\my-model.gguf"`. |
| `context_size` | Model context length (default 4096 is plenty for comments). |
| `threads` | CPU threads for the model; 0 lets llama.cpp decide. |

## Saved sessions

This tool opens at `http://127.0.0.1:8765`, so its **Save/Load** is separate from the standard tool's. Use **Export JSON** in one and **Import JSON** in the other to move a session across.

## Troubleshooting

- **Windows SmartScreen warns about `llama-server.exe`** — it's the official llama.cpp build; choose "More info → Run anyway", or ask your IT team.
- **School IT blocks unsigned programs** — the built-in model can't run on that computer. Use Custom endpoint or Copy AI Prompt instead.
- **"Port 8765 is already in use"** — the tool is already open; the browser is sent to it. Or change `ui_port` in `config.json`.
- **The model fails to start** — the error shows the last lines of `logs/llama-server.log`. Re-running `setup.bat` fixes missing or incomplete downloads.
- **"llama.cpp: files are in use" during setup** — close the Advanced tool's console window, then run setup again.
```

- [ ] **Step 2: Commit**

```bash
git add Rubric_Marking_Tool_Advanced/README.md
git commit -m "docs(advanced): setup, usage and troubleshooting README

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 14: Live end-to-end verification (real downloads, real model)

No new files. This is the spec's live test. Report any failure with its output rather than working around it.

- [ ] **Step 1: Clean setup**

From `Rubric_Marking_Tool_Advanced/` in PowerShell: `cmd /c "echo.| setup.bat"` (the piped newline answers `pause`). Use a 30-minute timeout; the model is ~3 GB.
Expected: `[ok] Portable Python 3.13.15 installed.`, `[ok] llama.cpp b<N> installed.`, `[ok] Model gemma-4-E2B-it-Q4_K_M.gguf installed.`, `Setup complete.`
Check: `bin/python/python.exe`, `bin/llama.cpp/llama-server.exe`, `bin/llama.cpp/VERSION`, `models/gemma-4-E2B-it-Q4_K_M.gguf` (3106738272 bytes) exist; no `*.part` files remain.

- [ ] **Step 2: Re-run setup — nothing downloads**

Run `cmd /c "echo.| setup.bat"` again.
Expected: three `[ok] … present / up to date` lines and `Everything up to date.` within a few seconds.

- [ ] **Step 3: Test suite on the portable Python**

Run: `bin\python\python.exe -m unittest discover -s tests -v` → all `ok`.

- [ ] **Step 4: Launch and generate a real comment**

1. Start `bin\python\python.exe server.py --no-browser` in the background (the .bat just adds dataset regeneration + pause; regenerate `_all.js` first if needed).
2. Browser → `http://127.0.0.1:8765/`. Select an outcome, mark two criteria with evidence notes, open Generate Comment.
3. Click Start → dot goes amber, then green "Ready · gemma-4-E2B-it-Q4_K_M.gguf".
4. Click Generate with AI → a comment appears in the box. Confirm: no `<think>`, `<|…|>` or "thought" text; Australian spelling; no grade letters. Note the time taken.
5. Click Stop → "Stopped"; `Get-Process llama-server` shows no process from this folder.

- [ ] **Step 5: Kill-on-close check**

Click Start again and wait for Ready. Then kill the Python server process (stop the background task, or `Stop-Process` its PID — this simulates closing the console window). Within ~5 s, `Get-Process llama-server -ErrorAction SilentlyContinue | Where-Object Path -like "*Rubric_Marking_Tool_Advanced*"` → nothing.

- [ ] **Step 6: Custom endpoint against real llama-server (optional)**

If tele_ai or another server is running on 8080, choose Custom endpoint with the default URL and generate a comment. Otherwise skip and say so.

- [ ] **Step 7: Proof and wrap-up**

Take a screenshot of the panel showing Ready and a generated comment. Confirm `git status` shows only the expected `_all.js` regeneration noise (and nothing under `bin/`, `models/`, `logs/`). No commit needed unless fixes were made.
