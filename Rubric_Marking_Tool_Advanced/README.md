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
