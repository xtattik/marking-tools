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
