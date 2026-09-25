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
