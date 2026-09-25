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

    def test_stop_during_loading_stays_stopped(self):
        manager = self.make("--delay", "30")
        manager.start()
        manager.stop()
        time.sleep(0.5)
        self.assertEqual(manager.status(), {"state": "stopped", "error": None})

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
