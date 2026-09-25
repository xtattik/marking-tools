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
