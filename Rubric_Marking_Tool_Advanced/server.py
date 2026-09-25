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
