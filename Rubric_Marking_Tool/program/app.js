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
  { key: "minus", label: "-", offset: -1, help: "just into this level" },
  { key: "solid", label: "=", offset: 0, help: "secure at this level" },
  { key: "plus", label: "+", offset: 1, help: "nearly at the next level" },
];

const state = {
  filter: "all",
  search: "",
  selected: {},
  marks: {},
  students: [],
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
  markingList: document.querySelector("#markingList"),
  overallGrade: document.querySelector("#overallGrade"),
  assignmentTitle: document.querySelector("#assignmentTitle"),
  studentName: document.querySelector("#studentName"),
  studentId: document.querySelector("#studentId"),
  commentTone: document.querySelector("#commentTone"),
  commentOutput: document.querySelector("#commentOutput"),
  taskContext: document.querySelector("#taskContext"),
  teacherNote: document.querySelector("#teacherNote"),
  aiEndpoint: document.querySelector("#aiEndpoint"),
  aiModel: document.querySelector("#aiModel"),
  aiStatus: document.querySelector("#aiStatus"),
  canvasExportPanel: document.querySelector("#canvasExportPanel"),
  canvasExportMeta: document.querySelector("#canvasExportMeta"),
  canvasCsvOutput: document.querySelector("#canvasCsvOutput"),
  rosterCount: document.querySelector("#rosterCount"),
  studentsView: document.querySelector("#studentsView"),
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

function modifierLabel(grade, modifier = "solid") {
  if (grade === "A++") return "Beyond stage";
  const match = modifiers.find((item) => item.key === modifier) || modifiers[1];
  return match.help;
}

function nextGrade(grade) {
  const index = pointGrades.indexOf(grade);
  if (index < 0 || index >= pointGrades.length - 1) return grade;
  return pointGrades[index + 1];
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
        types: [{ description: "CSV file", accept: { "text/csv": [".csv"] } }],
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

function exportMarks() {
  const criteria = selectedCriteria();
  if (!criteria.length) {
    toast("Select rubric criteria before exporting marks");
    return;
  }
  const student = els.studentName.value.trim() || "Student";
  const studentId = els.studentId.value.trim();
  const comment = els.commentOutput.value.trim();
  const headers = ["Name", "Student ID", ...criteria.map((item) => criterionCanvasName(item)), "Comment"];
  const values = [
    student,
    studentId,
    ...criteria.map((item) => {
      const mark = state.marks[item.id];
      if (!mark?.grade) return "";
      return levelValue(mark.grade, mark.modifier);
    }),
    comment,
  ];
  const csv = [headers, values].map((row) => row.map(csvEscape).join(",")).join("\r\n");
  const assignmentTitle = els.assignmentTitle.value.trim() || "assessment";
  downloadTextFile(`${safeFilename(assignmentTitle)}-marks.csv`, csv);
  toast(`Marks exported for ${student}`);
}

async function exportCanvasRubricCsv(useRange = false) {
  const criteria = selectedCriteria();
  if (!criteria.length) {
    toast("Select at least one outcome before exporting");
    return;
  }
  const rubricTitle = els.assignmentTitle.value.trim() || "Science Assessment";
  const header = ["Rubric Name", "Criteria Name", "Criteria Description", "Criteria Enable Range"];
  for (let i = 0; i < canvasRatings.length; i += 1) {
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
  if (!saved) downloadCsvFile(filename, csv);
}

// --- Roster ---

function updateRosterCount() {
  if (!els.rosterCount) return;
  const count = state.students.length;
  if (count) {
    els.rosterCount.textContent = `${count} student${count !== 1 ? "s" : ""} in roster`;
    els.rosterCount.hidden = false;
  } else {
    els.rosterCount.hidden = true;
  }
}

function addStudentToRoster() {
  const name = els.studentName.value.trim();
  if (!name) {
    toast("Enter a student name before adding to class");
    return;
  }
  const criteria = selectedCriteria();
  if (!criteria.length) {
    toast("Select rubric criteria before adding a student");
    return;
  }
  const markedItems = criteria.filter((item) => state.marks[item.id]?.grade);
  if (!markedItems.length) {
    toast("Mark at least one criterion before adding to class");
    return;
  }

  const criteriaNames = {};
  criteria.forEach((item) => { criteriaNames[item.id] = criterionCanvasName(item); });

  const markedValues = markedItems.map((item) => state.marks[item.id]);
  const average =
    markedValues.reduce((sum, mark) => sum + levelValue(mark.grade, mark.modifier), 0) / markedValues.length;

  const student = {
    name,
    id: els.studentId.value.trim(),
    marks: JSON.parse(JSON.stringify(state.marks)),
    comment: els.commentOutput.value,
    tone: els.commentTone.value,
    taskContext: els.taskContext.value,
    teacherNote: els.teacherNote.value,
    timestamp: new Date().toLocaleString("en-AU"),
    selected: JSON.parse(JSON.stringify(state.selected)),
    activeDataset: state.activeDataset,
    criteriaNames,
    overallGrade: average.toFixed(1),
    markedCount: markedItems.length,
  };

  const existingIndex = state.students.findIndex((s) => s.name === name);
  if (existingIndex >= 0) {
    state.students[existingIndex] = student;
    toast(`Updated ${name} in class roster`);
  } else {
    state.students.push(student);
    toast(`${name} added to class (${state.students.length} total)`);
  }

  els.studentName.value = "";
  els.studentId.value = "";
  state.marks = {};
  els.commentOutput.value = "";
  renderAll();
}

function reloadStudent(index) {
  const student = state.students[index];
  if (!student) return;

  els.studentName.value = student.name;
  els.studentId.value = student.id || "";
  els.commentTone.value = student.tone || "balanced";
  els.taskContext.value = student.taskContext || "";
  els.teacherNote.value = student.teacherNote || "";
  els.commentOutput.value = student.comment || "";
  state.marks = JSON.parse(JSON.stringify(student.marks));
  state.selected = JSON.parse(JSON.stringify(student.selected));
  if (student.activeDataset && datasets[student.activeDataset]) {
    state.activeDataset = student.activeDataset;
    syncDatasetSelects();
  }

  document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
  document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
  document.querySelector('[data-view="mark"]').classList.add("active");
  document.querySelector("#markView").classList.add("active");

  renderAll();
  toast(`${student.name} loaded — edit and re-add to update`);
}

function renderStudents() {
  const view = els.studentsView;
  updateRosterCount();

  if (!state.students.length) {
    view.innerHTML = `
      <div class="view-heading">
        <div>
          <h2>Class Roster</h2>
          <p>No students marked yet. Use <strong>Add to Class</strong> in the Mark tab.</p>
        </div>
        <div class="card-actions">
          <button type="button" disabled>Export Class CSV</button>
          <button type="button" disabled>Clear Roster</button>
        </div>
      </div>
      <div class="empty-state" style="min-height:180px">Add students from the Mark tab to build your class roster.</div>`;
    return;
  }

  const rows = state.students
    .map(
      (student, index) => `
      <tr>
        <td>${escapeHtml(student.name)}</td>
        <td class="id-cell">${escapeHtml(student.id || "")}</td>
        <td class="scale-cell">${escapeHtml(student.overallGrade)}</td>
        <td>${student.markedCount} / ${Object.keys(student.criteriaNames).length}</td>
        <td class="comment-preview">${escapeHtml(shortText(student.comment, 80))}</td>
        <td class="small-note">${escapeHtml(student.timestamp)}</td>
        <td class="roster-actions">
          <button type="button" class="roster-reload" data-index="${index}">Reload</button>
          <button type="button" class="roster-delete danger-btn" data-index="${index}">Remove</button>
        </td>
      </tr>`
    )
    .join("");

  view.innerHTML = `
    <div class="view-heading">
      <div>
        <h2>Class Roster</h2>
        <p>${state.students.length} student${state.students.length !== 1 ? "s" : ""} marked.</p>
      </div>
      <div class="card-actions">
        <button id="exportClassCsv" type="button">Export Class CSV</button>
        <button id="clearRoster" type="button">Clear Roster</button>
      </div>
    </div>
    <div class="roster-wrap">
      <table class="roster-table">
        <thead>
          <tr>
            <th>Student</th>
            <th>ID</th>
            <th>Scale avg</th>
            <th>Criteria marked</th>
            <th>Comment preview</th>
            <th>Marked at</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;

  view.querySelector("#exportClassCsv").addEventListener("click", exportClassCsv);
  view.querySelector("#clearRoster").addEventListener("click", () => {
    state.students = [];
    renderStudents();
    toast("Roster cleared");
  });
  view.querySelectorAll(".roster-reload").forEach((btn) => {
    btn.addEventListener("click", () => reloadStudent(parseInt(btn.dataset.index, 10)));
  });
  view.querySelectorAll(".roster-delete").forEach((btn) => {
    btn.addEventListener("click", () => {
      const removed = state.students.splice(parseInt(btn.dataset.index, 10), 1);
      toast(`${removed[0]?.name || "Student"} removed from roster`);
      renderStudents();
    });
  });
}

function exportClassCsv() {
  if (!state.students.length) {
    toast("No students in the roster yet");
    return;
  }

  const criterionIdOrder = [];
  const criterionNameMap = {};
  state.students.forEach((student) => {
    Object.entries(student.criteriaNames || {}).forEach(([id, name]) => {
      if (!criterionNameMap[id]) {
        criterionNameMap[id] = name;
        criterionIdOrder.push(id);
      }
    });
  });

  const headers = ["Name", "Student ID", ...criterionIdOrder.map((id) => criterionNameMap[id]), "Scale Average", "Comment"];
  const dataRows = state.students.map((student) => [
    student.name,
    student.id || "",
    ...criterionIdOrder.map((id) => {
      const mark = student.marks[id];
      if (!mark?.grade) return "";
      return levelValue(mark.grade, mark.modifier);
    }),
    student.overallGrade,
    student.comment || "",
  ]);

  const csv = [headers, ...dataRows].map((row) => row.map(csvEscape).join(",")).join("\r\n");
  const assignmentTitle = els.assignmentTitle.value.trim() || "assessment";
  downloadTextFile(`${safeFilename(assignmentTitle)}-class-marks.csv`, csv);
  toast(`Exported ${state.students.length} student${state.students.length !== 1 ? "s" : ""}`);
}

// --- Session management ---

function buildSessionPayload() {
  return {
    version: 1,
    assignmentTitle: els.assignmentTitle.value,
    studentName: els.studentName.value,
    studentId: els.studentId.value,
    commentTone: els.commentTone.value,
    taskContext: els.taskContext.value,
    teacherNote: els.teacherNote.value,
    aiEndpoint: els.aiEndpoint.value,
    aiModel: els.aiModel.value,
    comment: els.commentOutput.value,
    selected: state.selected,
    marks: state.marks,
    activeDataset: state.activeDataset,
    students: state.students,
  };
}

function restoreSession(payload) {
  els.assignmentTitle.value = payload.assignmentTitle || els.assignmentTitle.value;
  els.studentName.value = payload.studentName || "";
  els.studentId.value = payload.studentId || "";
  els.commentTone.value = payload.commentTone || "balanced";
  els.taskContext.value = payload.taskContext || "";
  els.teacherNote.value = payload.teacherNote || "";
  els.aiEndpoint.value = payload.aiEndpoint || "http://127.0.0.1:8080/v1/chat/completions";
  els.aiModel.value = payload.aiModel || "local-model";
  if (payload.comment) els.commentOutput.value = payload.comment;
  state.selected = payload.selected || {};
  state.marks = payload.marks || {};
  state.students = payload.students || [];
  if (payload.activeDataset && datasets[payload.activeDataset]) {
    state.activeDataset = payload.activeDataset;
    syncDatasetSelects();
  }
  renderAll();
  renderStudents();
}

function saveSession() {
  localStorage.setItem("rubricMarkingSession", JSON.stringify(buildSessionPayload()));
  const count = state.students.length;
  toast(`Session saved — ${count} student${count !== 1 ? "s" : ""} in roster`);
}

function loadSession() {
  const raw = localStorage.getItem("rubricMarkingSession");
  if (!raw) {
    toast("No saved session found");
    return;
  }
  try {
    restoreSession(JSON.parse(raw));
    const count = state.students.length;
    toast(`Session loaded — ${count} student${count !== 1 ? "s" : ""} in roster`);
  } catch {
    toast("Could not restore session — data may be corrupted");
  }
}

function exportSessionJson() {
  const payload = { ...buildSessionPayload(), exportedAt: new Date().toISOString() };
  const assignmentTitle = els.assignmentTitle.value.trim() || "session";
  downloadTextFile(
    `${safeFilename(assignmentTitle)}-session.json`,
    JSON.stringify(payload, null, 2),
    "application/json;charset=utf-8"
  );
  toast("Session exported as JSON file");
}

function importSessionJson() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      restoreSession(JSON.parse(await file.text()));
      const count = state.students.length;
      toast(`Session imported — ${count} student${count !== 1 ? "s" : ""} in roster`);
    } catch {
      toast("Could not read session file — check it is a valid JSON export");
    }
  };
  input.click();
}

// --- Render ---

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
                ${grades.map((grade) => `<td>${escapeHtml(component.descriptors[grade] || "")}</td>`).join("")}
              </tr>`
          )
          .join("")}
      </tbody>
    </table>`;
}

function renderMarking() {
  const criteria = selectedCriteria();
  if (!criteria.length) {
    els.markingList.className = "marking-list empty-state";
    els.markingList.textContent = "Select rubric criteria first.";
    els.overallGrade.textContent = "No internal scale yet";
    return;
  }

  els.markingList.className = "marking-list";
  els.markingList.innerHTML = criteria
    .map(({ id, rubric, mode, component }) => {
      const mark = state.marks[id] || {};
      const selectedGrade = mark.grade || "";
      const modifier = mark.modifier || "solid";
      const descriptor = selectedGrade
        ? component.descriptors[selectedGrade]
        : "Choose the descriptor that best matches the evidence.";
      const internalValue = selectedGrade ? levelValue(selectedGrade, modifier) : "";
      return `
        <article class="mark-card ${selectedGrade ? "selected" : ""}">
          <header>
            <h3>${escapeHtml(rubric.code)} ${escapeHtml(rubric.title)} - ${modeLabel(mode)}</h3>
            <p class="meta">${escapeHtml(rubric.description)}</p>
          </header>
          <div class="grade-row" role="group" aria-label="Descriptor level choices">
            ${pointGrades
              .map(
                (grade) =>
                  `<button type="button" class="grade-option ${
                    selectedGrade === grade ? "active" : ""
                  }" data-criterion="${escapeHtml(id)}" data-grade="${grade}">${levelLabel(grade)}</button>`
              )
              .join("")}
          </div>
          ${
            selectedGrade
              ? `<div class="modifier-row" role="group" aria-label="Internal refinement">
                  ${modifiers
                    .map(
                      (item) =>
                        `<button type="button" class="modifier-option ${
                          modifier === item.key ? "active" : ""
                        }" data-criterion="${escapeHtml(id)}" data-modifier="${item.key}" ${
                          selectedGrade === "A++" && item.key !== "solid" ? "disabled" : ""
                        } title="${escapeHtml(item.help)}">${item.label}</button>`
                    )
                    .join("")}
                  <span class="scale-note">Teacher scale: ${internalValue} - ${escapeHtml(
                  modifierLabel(selectedGrade, modifier)
                )}</span>
                </div>`
              : ""
          }
          <div class="descriptor">${escapeHtml(descriptor)}</div>
          <label>
            <span>Evidence note</span>
            <textarea data-note="${escapeHtml(id)}" placeholder="Optional: what did the student do that showed this?">${escapeHtml(
        mark.note || ""
      )}</textarea>
          </label>
        </article>`;
    })
    .join("");

  updateOverallGrade();
}

function updateOverallGrade() {
  const marks = selectedCriteria()
    .map((item) => state.marks[item.id])
    .filter((mark) => mark?.grade);

  if (!marks.length) {
    els.overallGrade.textContent = "No internal scale yet";
    return;
  }

  const average = marks.reduce((sum, mark) => sum + levelValue(mark.grade, mark.modifier), 0) / marks.length;
  els.overallGrade.textContent = `Teacher scale: ${average.toFixed(1)}`;
}

function sentenceFromDescriptor(descriptor) {
  const clean = String(descriptor || "").replace(/\s+/g, " ").trim();
  if (!clean) return "";
  return clean.split(/(?<=[.!?])\s+/)[0] || clean;
}

function removeGradeLanguage(text) {
  return String(text || "")
    .replace(/\b(E|D|C|B|A\+\+|A)\s+(standard|descriptor|level|grade)\b/gi, "this level")
    .replace(/\b(grade|standard|mark)\b/gi, "descriptor")
    .replace(/\s+/g, " ")
    .trim();
}

function markedCriteria() {
  return selectedCriteria()
    .map((item) => ({ ...item, mark: state.marks[item.id] || {} }))
    .filter((item) => item.mark.grade);
}

function buildAiPrompt() {
  const marked = markedCriteria();
  const student = els.studentName.value.trim() || "the student";
  const context = els.taskContext.value.trim() || "this science task";
  const tone = els.commentTone.value;
  const teacherNote = els.teacherNote.value.trim();

  if (!marked.length) return "";

  const criteria = marked
    .map((item) => {
      const current = sentenceFromDescriptor(item.component.descriptors[item.mark.grade]);
      const next = sentenceFromDescriptor(item.component.descriptors[nextGrade(item.mark.grade)] || "");
      return [
        `Outcome: ${item.rubric.code} ${item.rubric.title}`,
        `What the student demonstrated: ${removeGradeLanguage(current)}`,
        `Evidence note: ${item.mark.note?.trim() || "No specific evidence note provided."}`,
        `Next-step direction: ${removeGradeLanguage(next) || "Extend the quality, clarity and independence of the work."}`,
      ].join("\n");
    })
    .join("\n\n");

  return `You are helping an Australian high school science teacher write concise student feedback.

Student: ${student}
Task context: ${context}
Tone: ${tone}
Teacher note to include if relevant: ${teacherNote || "None"}

Selected outcome evidence:
${criteria}

Write one polished feedback comment for the student.

Rules:
- Do not mention marks, grades, numbers, E, D, C, B, A, A++, standards, rubrics, or descriptor labels.
- Do not mention theory, applied, practical/applied, or knowledge/theory as separate categories.
- Do not restate the rubric in full.
- Start with what the student has demonstrated.
- Include one or two specific strengths using the evidence notes.
- Include clear next steps using the next-step directions.
- Use Australian English spelling.
- Keep it professional, warm, and suitable for a Year 9 or Year 10 science student.
- Aim for 30 - 50 words per outcome assessed.`;
}

function setAiStatus(message, kind = "") {
  els.aiStatus.textContent = message;
  els.aiStatus.className = `ai-status ${kind}`.trim();
}

function cleanAiComment(text) {
  return String(text || "")
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/^\s*(feedback comment:|comment:)\s*/i, "")
    .trim();
}

async function generateWithLocalAi() {
  const prompt = buildAiPrompt();
  if (!prompt) {
    setAiStatus("Select rubric criteria and choose at least one matching descriptor first.", "error");
    return;
  }

  const endpoint = els.aiEndpoint.value.trim() || "http://127.0.0.1:8080/v1/chat/completions";
  const model = els.aiModel.value.trim() || "local-model";
  setAiStatus("Asking your local AI server...", "working");

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: "You write clear, specific Australian high school science feedback. Follow the user's constraints exactly.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.55,
        top_p: 0.9,
        max_tokens: 450,
        stream: false,
      }),
    });

    if (!response.ok) throw new Error(`Local AI server returned ${response.status}`);

    const result = await response.json();
    const content = cleanAiComment(result?.choices?.[0]?.message?.content || result?.choices?.[0]?.text || "");
    if (!content) throw new Error("Local AI returned an empty response");

    els.commentOutput.value = content;
    setAiStatus("Local AI comment generated. Edit it freely before using it.");
  } catch (error) {
    setAiStatus(
      `Could not reach the local AI server. Check that llama-server is running on port 8080. ${error.message}`,
      "error"
    );
  }
}

function generateComment() {
  const marked = markedCriteria();

  if (!marked.length) {
    els.commentOutput.value = "Select rubric criteria and choose at least one matching descriptor to generate feedback.";
    return;
  }

  const student = els.studentName.value.trim() || "The student";
  const firstName = student.split(/\s+/)[0] || "The student";
  const context = els.taskContext.value.trim();
  const teacherNote = els.teacherNote.value.trim();
  const tone = els.commentTone.value;
  const sorted = [...marked].sort(
    (a, b) => levelValue(b.mark.grade, b.mark.modifier) - levelValue(a.mark.grade, a.mark.modifier)
  );
  const strengths = sorted.slice(0, Math.min(2, sorted.length));
  const targets = [...marked]
    .sort((a, b) => levelValue(a.mark.grade, a.mark.modifier) - levelValue(b.mark.grade, b.mark.modifier))
    .slice(0, Math.min(2, marked.length));

  const opener =
    tone === "encouraging"
      ? `${student} has made a positive effort${context ? ` in ${context}` : ""} and is developing clearer science skills.`
      : tone === "direct"
      ? `${student} has demonstrated relevant scientific understanding${context ? ` in ${context}` : ""}.`
      : `${student} has demonstrated scientific understanding and skill${context ? ` in ${context}` : ""}.`;

  const strengthText = strengths
    .map((item) => {
      const note = item.mark.note
        ? ` This was shown when ${item.mark.note.trim()}`
        : ` This was evident in the way ${firstName} approached this part of the task.`;
      return `${firstName} demonstrated strength in ${item.rubric.title}.${note}`;
    })
    .join(" ");

  const targetText = targets
    .map((item) => {
      const nextDescriptor = item.component.descriptors[nextGrade(item.mark.grade)] || item.component.descriptors.C;
      return `To improve in ${item.rubric.title}, ${firstName} should look to ${removeGradeLanguage(
        sentenceFromDescriptor(nextDescriptor)
      ).replace(/^[A-Z]/, (match) => match.toLowerCase())}`;
    })
    .join(" ");

  const noteText = teacherNote ? ` ${teacherNote}` : "";
  const closer =
    tone === "direct"
      ? "The next step is to make the evidence and scientific reasoning more explicit and consistent."
      : "More explicit evidence and clearer scientific reasoning will help move the work forward.";

  els.commentOutput.value = `${opener}\n\n${strengthText}\n\n${targetText}${noteText}\n\n${closer}`;
}

function renderAll() {
  renderLibrary();
  renderRubricTable();
  renderMarking();
  generateComment();
  updateRosterCount();
}


function toast(message) {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = message;
  document.body.append(el);
  setTimeout(() => el.remove(), 2200);
}

// --- Event listeners ---

document.querySelectorAll(".filter").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".filter").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    state.filter = button.dataset.filter;
    renderLibrary();
  });
});

document.querySelectorAll(".tab").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((item) => item.classList.remove("active"));
    document.querySelectorAll(".view").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    document.querySelector(`#${button.dataset.view}View`).classList.add("active");
    if (button.dataset.view === "students") renderStudents();
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

els.markingList.addEventListener("click", (event) => {
  const button = event.target.closest(".grade-option");
  if (!button) return;
  const id = button.dataset.criterion;
  state.marks[id] = { ...(state.marks[id] || {}), grade: button.dataset.grade };
  if (button.dataset.grade === "A++") state.marks[id].modifier = "solid";
  else state.marks[id].modifier = state.marks[id].modifier || "solid";
  renderMarking();
  generateComment();
});

els.markingList.addEventListener("click", (event) => {
  const button = event.target.closest(".modifier-option");
  if (!button || button.disabled) return;
  const id = button.dataset.criterion;
  state.marks[id] = { ...(state.marks[id] || {}), modifier: button.dataset.modifier };
  renderMarking();
  generateComment();
});

els.markingList.addEventListener("input", (event) => {
  const noteId = event.target.dataset.note;
  if (!noteId) return;
  state.marks[noteId] = { ...(state.marks[noteId] || {}), note: event.target.value };
  generateComment();
});

document.querySelector("#clearSelection").addEventListener("click", () => {
  state.selected = {};
  state.marks = {};
  els.canvasCsvOutput.value = "";
  els.canvasExportPanel.hidden = true;
  renderAll();
});

document.querySelector("#addToClass").addEventListener("click", addStudentToRoster);
document.querySelector("#exportMarks").addEventListener("click", exportMarks);
document.querySelector("#regenerateComment").addEventListener("click", generateComment);
document.querySelector("#exportCanvasSimple").addEventListener("click", () => exportCanvasRubricCsv(false));
document.querySelector("#exportCanvasRanged").addEventListener("click", () => exportCanvasRubricCsv(true));

document.querySelector("#saveCanvasCsv").addEventListener("click", async () => {
  const csv = els.canvasCsvOutput.value;
  const filename = els.canvasCsvOutput.dataset.filename || "canvas-rubric.csv";
  if (!csv.trim()) { toast("No CSV has been generated yet"); return; }
  await saveTextFile(filename, csv);
});
document.querySelector("#downloadCanvasCsv").addEventListener("click", () => {
  const csv = els.canvasCsvOutput.value;
  const filename = els.canvasCsvOutput.dataset.filename || "canvas-rubric.csv";
  if (!csv.trim()) { toast("No CSV has been generated yet"); return; }
  downloadCsvFile(filename, csv);
});
document.querySelector("#copyCanvasCsv").addEventListener("click", async () => {
  const csv = els.canvasCsvOutput.value;
  if (!csv.trim()) { toast("No CSV has been generated yet"); return; }
  await navigator.clipboard.writeText(csv);
  toast("Canvas CSV copied");
});

document.querySelector("#generateAiComment").addEventListener("click", generateWithLocalAi);
document.querySelector("#copyAiPrompt").addEventListener("click", async () => {
  const prompt = buildAiPrompt();
  if (!prompt) {
    setAiStatus("Select rubric criteria and choose at least one matching descriptor first.", "error");
    return;
  }
  await navigator.clipboard.writeText(prompt);
  setAiStatus("AI prompt copied. You can paste it into any local or online AI tool.");
});


document.querySelector("#saveSession").addEventListener("click", saveSession);
document.querySelector("#loadSession").addEventListener("click", loadSession);
document.querySelector("#exportJson").addEventListener("click", exportSessionJson);
document.querySelector("#importJson").addEventListener("click", importSessionJson);
document.querySelector("#printView").addEventListener("click", () => window.print());

document.querySelector("#copyComment").addEventListener("click", async () => {
  await navigator.clipboard.writeText(els.commentOutput.value);
  toast("Comment copied");
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

[els.assignmentTitle, els.studentName, els.commentTone, els.taskContext, els.teacherNote].forEach((el) => {
  el.addEventListener("input", generateComment);
  el.addEventListener("change", generateComment);
});

renderAll();
