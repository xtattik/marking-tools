"""Stand-in for llama-server.exe used by the tests.

--delay N  : /health returns 503 for N seconds, then 200
--fail     : print a load error and exit with code 3
"""
import argparse
import json
import sys
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, required=True)
    parser.add_argument("--delay", type=float, default=0.0)
    parser.add_argument("--fail", action="store_true")
    args = parser.parse_args()

    if args.fail:
        print("error: failed to load model 'fake.gguf'", flush=True)
        sys.exit(3)

    ready_at = time.monotonic() + args.delay

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *_):
            pass

        def _json(self, code, obj):
            data = json.dumps(obj).encode()
            self.send_response(code)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)

        def do_GET(self):
            if self.path == "/health":
                ready = time.monotonic() >= ready_at
                return self._json(200 if ready else 503, {"status": "ok" if ready else "loading model"})
            self._json(404, {})

        def do_POST(self):
            length = int(self.headers.get("Content-Length") or 0)
            body = json.loads(self.rfile.read(length) or b"{}")
            count = len(body.get("messages", []))
            self._json(200, {"choices": [{"message": {"role": "assistant", "content": f"Fake comment ({count} messages)"}}]})

    print("fake llama-server listening", flush=True)
    ThreadingHTTPServer(("127.0.0.1", args.port), Handler).serve_forever()


if __name__ == "__main__":
    main()
