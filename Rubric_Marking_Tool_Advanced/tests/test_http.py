import http.client
import json
import tempfile
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import support
import server


class FakeUpstream:
    """An OpenAI-style endpoint standing in for tele_ai / Unsloth / llama-server."""

    def __init__(self):
        received = self.received = []

        class Handler(BaseHTTPRequestHandler):
            def log_message(self, *_):
                pass

            def do_POST(self):
                length = int(self.headers.get("Content-Length") or 0)
                received.append((self.path, json.loads(self.rfile.read(length))))
                data = json.dumps({"choices": [{"message": {"content": "Upstream reply"}}]}).encode()
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(data)))
                self.end_headers()
                self.wfile.write(data)

        self.httpd = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        self.port = self.httpd.server_address[1]
        threading.Thread(target=self.httpd.serve_forever, daemon=True).start()

    def close(self):
        self.httpd.shutdown()
        self.httpd.server_close()


class HttpTests(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.root = Path(tmp.name) / "advanced"
        self.standard = Path(tmp.name) / "standard"
        self.web = self.root / "web"
        self.standard.mkdir(parents=True)
        self.web.mkdir(parents=True)
        (self.standard / "index.html").write_text("<html><head></head><body></body></html>", encoding="utf-8")
        (self.standard / "styles.css").write_text("body{}", encoding="utf-8")
        (self.web / "advanced-ai.js").write_text("// panel", encoding="utf-8")
        (Path(tmp.name) / "secret.txt").write_text("secret", encoding="utf-8")

        self.model_port = support.free_port()
        config = dict(server.DEFAULT_CONFIG, model_port=self.model_port)
        manager = server.ModelManager(
            support.fake_command(self.model_port), self.model_port, self.root / "logs" / "llama-server.log"
        )
        self.app = server.App(config, self.root, self.standard, self.web, manager=manager)
        self.httpd = server.make_server(self.app, 0)
        self.port = self.httpd.server_address[1]
        threading.Thread(target=self.httpd.serve_forever, daemon=True).start()
        self.addCleanup(self.app.manager.stop)
        self.addCleanup(self.httpd.server_close)
        self.addCleanup(self.httpd.shutdown)

    def request(self, method, path, body=None, headers=None):
        conn = http.client.HTTPConnection("127.0.0.1", self.port, timeout=20)
        data = None if body is None else json.dumps(body).encode()
        all_headers = {"Content-Type": "application/json"} if data is not None else {}
        all_headers.update(headers or {})
        conn.request(method, path, body=data, headers=all_headers)
        response = conn.getresponse()
        result = (response.status, response.getheader("Content-Type"), response.read())
        conn.close()
        return result

    def post_json(self, path, body=None, headers=None):
        status, _, data = self.request("POST", path, body if body is not None else {}, headers)
        return status, json.loads(data)

    def create_fake_install(self):
        exe = self.root / "bin" / "llama.cpp" / "llama-server.exe"
        exe.parent.mkdir(parents=True)
        exe.write_bytes(b"")
        model = self.root / "models" / server.DEFAULT_CONFIG["model_file"]
        model.parent.mkdir(parents=True)
        model.write_bytes(b"")

    # --- static serving ---

    def test_index_is_served_with_advanced_panel_injected(self):
        for path in ("/", "/index.html"):
            status, ctype, body = self.request("GET", path)
            self.assertEqual(status, 200)
            self.assertTrue(ctype.startswith("text/html"))
            self.assertIn(b'/advanced/advanced-ai.js', body)
            self.assertIn(b'/advanced/advanced-ai.css', body)

    def test_standard_files_are_served(self):
        status, ctype, body = self.request("GET", "/styles.css?v=1")
        self.assertEqual((status, body), (200, b"body{}"))
        self.assertTrue(ctype.startswith("text/css"))

    def test_advanced_files_are_served(self):
        status, ctype, body = self.request("GET", "/advanced/advanced-ai.js")
        self.assertEqual((status, body), (200, b"// panel"))
        self.assertTrue(ctype.startswith("text/javascript"))

    def test_traversal_is_rejected(self):
        for path in ("/../secret.txt", "/%2e%2e/secret.txt", "/advanced/../../secret.txt"):
            self.assertEqual(self.request("GET", path)[0], 404, path)

    # --- model API ---

    def test_status_starts_stopped_with_model_name(self):
        status, _, body = self.request("GET", "/api/model/status")
        self.assertEqual(status, 200)
        self.assertEqual(
            json.loads(body), {"state": "stopped", "error": None, "model": server.DEFAULT_CONFIG["model_file"]}
        )

    def test_start_without_llama_server_explains_setup(self):
        status, body = self.post_json("/api/model/start")
        self.assertEqual(status, 200)
        self.assertEqual(body["state"], "error")
        self.assertIn("llama-server.exe not found", body["error"])
        self.assertIn("setup.bat", body["error"])

    def test_start_without_model_explains_setup(self):
        exe = self.root / "bin" / "llama.cpp" / "llama-server.exe"
        exe.parent.mkdir(parents=True)
        exe.write_bytes(b"")
        status, body = self.post_json("/api/model/start")
        self.assertEqual(body["state"], "error")
        self.assertIn("Model file not found", body["error"])

    def test_start_and_stop_through_the_api(self):
        self.create_fake_install()
        status, body = self.post_json("/api/model/start")
        self.assertEqual(body["state"], "starting")
        status, body = self.post_json("/api/model/stop")
        self.assertEqual(body["state"], "stopped")

    def test_foreign_origin_is_refused(self):
        status, body = self.post_json("/api/model/start", headers={"Origin": "https://evil.example"})
        self.assertEqual(status, 403)

    def test_own_origin_is_allowed(self):
        status, _ = self.post_json("/api/model/stop", headers={"Origin": f"http://127.0.0.1:{self.port}"})
        self.assertEqual(status, 200)

    def test_post_without_json_content_type_is_refused(self):
        status, _, _ = self.request("POST", "/api/model/stop", headers={"Content-Type": "text/plain"})
        self.assertEqual(status, 415)

    def test_invalid_content_length_is_handled(self):
        for bogus in ("-5", "abc"):
            conn = http.client.HTTPConnection("127.0.0.1", self.port, timeout=20)
            conn.putrequest("POST", "/api/model/stop")
            conn.putheader("Content-Type", "application/json")
            conn.putheader("Content-Length", bogus)
            conn.endheaders()
            response = conn.getresponse()
            status = response.status
            response.read()
            conn.close()
            self.assertEqual(status, 200, bogus)

    # --- chat proxy ---

    def test_chat_requires_payload(self):
        status, body = self.post_json("/api/chat", {"target": "builtin"})
        self.assertEqual(status, 400)
        self.assertIn("payload", body["error"])

    def test_chat_builtin_requires_running_model(self):
        status, body = self.post_json("/api/chat", {"target": "builtin", "payload": {"messages": []}})
        self.assertEqual(status, 409)
        self.assertIn("Start", body["error"])

    def test_chat_custom_requires_http_url(self):
        status, body = self.post_json("/api/chat", {"target": "custom", "endpoint": "ftp://x", "payload": {}})
        self.assertEqual(status, 400)

    def test_chat_custom_forwards_to_endpoint(self):
        upstream = FakeUpstream()
        self.addCleanup(upstream.close)
        payload = {"model": "m", "messages": [{"role": "user", "content": "hi"}]}
        status, body = self.post_json(
            "/api/chat",
            {"target": "custom", "endpoint": f"http://127.0.0.1:{upstream.port}/v1/chat/completions", "payload": payload},
        )
        self.assertEqual(status, 200)
        self.assertEqual(body["choices"][0]["message"]["content"], "Upstream reply")
        self.assertEqual(upstream.received, [("/v1/chat/completions", payload)])

    def test_chat_custom_unreachable_is_502(self):
        dead_port = support.free_port()
        status, body = self.post_json(
            "/api/chat",
            {"target": "custom", "endpoint": f"http://127.0.0.1:{dead_port}/v1/chat/completions", "payload": {}},
        )
        self.assertEqual(status, 502)
        self.assertIn("Could not reach", body["error"])

    def test_chat_builtin_forwards_when_ready(self):
        self.create_fake_install()
        self.post_json("/api/model/start")
        import time

        deadline = time.monotonic() + 15
        while self.app.manager.status()["state"] != "ready" and time.monotonic() < deadline:
            time.sleep(0.1)
        status, body = self.post_json(
            "/api/chat", {"target": "builtin", "payload": {"messages": [{"role": "user", "content": "x"}]}}
        )
        self.assertEqual(status, 200)
        self.assertEqual(body["choices"][0]["message"]["content"], "Fake comment (1 messages)")

    # --- ports ---

    def test_second_server_on_same_port_fails(self):
        with self.assertRaises(OSError):
            server.make_server(self.app, self.port)


class BuildCommandTests(unittest.TestCase):
    def test_command_uses_config(self):
        root = Path("C:/tool")
        config = dict(server.DEFAULT_CONFIG, threads=4)
        app = server.App(config, root, root / "std", root / "web")
        cmd = app.build_llama_command()
        self.assertEqual(cmd[0], str(root / "bin" / "llama.cpp" / "llama-server.exe"))
        for pair in (
            ["-m", str(root / "models" / config["model_file"])],
            ["--host", "127.0.0.1"],
            ["--port", "8766"],
            ["-c", "4096"],
            ["--reasoning", "off"],
            ["-t", "4"],
        ):
            index = cmd.index(pair[0])
            self.assertEqual(cmd[index : index + 2], pair)
        self.assertIn("--no-webui", cmd)

    def test_threads_zero_is_omitted(self):
        root = Path("C:/tool")
        app = server.App(dict(server.DEFAULT_CONFIG), root, root / "std", root / "web")
        self.assertNotIn("-t", app.build_llama_command())


if __name__ == "__main__":
    unittest.main()
