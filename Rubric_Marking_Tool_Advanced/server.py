"""Advanced Rubric Marking Tool server.

Serves the standard Rubric Marking Tool with the Advanced AI panel injected,
starts/stops a built-in llama-server, and proxies chat requests to it or to a
custom endpoint. Standard library only, so it runs on the embeddable Python
that setup.bat downloads.
"""
import argparse
import json
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit

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
    # Popen._handle is CPython's private process handle on Windows; if it ever changes, this fails safe (no job, returns None).
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
            except urllib.error.HTTPError as exc:
                exc.close()  # 503 while the model loads; close it so the socket isn't leaked
            except (urllib.error.URLError, OSError):
                pass  # not listening yet
            time.sleep(0.3)
        self._fail(proc, f"The model did not become ready within {int(self.health_timeout)} seconds.")

    def _fail(self, proc, message):
        with self._lock:
            if self._proc is not proc:
                return  # stopped or restarted meanwhile
            self._proc = None
            job, self._job = self._job, None
        _terminate(proc)
        error = f"{message}\n{tail_file(self.log_path)}".strip()
        with self._lock:
            # Still "starting" unless stop() or start() ran while we were terminating.
            if self._proc is None and self._state == "starting":
                self._state = "error"
                self._error = error
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
        try:
            length = int(self.headers.get("Content-Length") or 0)
        except ValueError:
            length = 0
        length = max(0, min(length, MAX_BODY))
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
