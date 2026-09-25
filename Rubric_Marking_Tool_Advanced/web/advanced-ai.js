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
