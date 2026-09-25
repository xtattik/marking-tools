"""Advanced Rubric Marking Tool server.

Serves the standard Rubric Marking Tool with the Advanced AI panel injected,
starts/stops a built-in llama-server, and proxies chat requests to it or to a
custom endpoint. Standard library only, so it runs on the embeddable Python
that setup.bat downloads.
"""
import json
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request
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
