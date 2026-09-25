import json
import tempfile
import unittest
from pathlib import Path

import support  # noqa: F401  (puts the tool folder on sys.path)
import server


class InjectAdvancedTests(unittest.TestCase):
    def test_injects_css_before_head_and_script_before_body(self):
        html = '<html><head><title>x</title></head><body><script src="app.js"></script></body></html>'
        out = server.inject_advanced(html)
        self.assertIn('<link rel="stylesheet" href="/advanced/advanced-ai.css">\n</head>', out)
        self.assertIn(
            '<script src="app.js"></script><script src="/advanced/advanced-ai.js"></script>\n</body>', out
        )

    def test_html_without_tags_is_unchanged(self):
        self.assertEqual(server.inject_advanced("plain text"), "plain text")


class ResolveStaticTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.base = Path(self.tmp.name) / "program"
        (self.base / "datasets").mkdir(parents=True)
        (self.base / "index.html").write_text("<html></html>", encoding="utf-8")
        (self.base / "datasets" / "_all.js").write_text("//", encoding="utf-8")
        self.secret = Path(self.tmp.name) / "secret.txt"
        self.secret.write_text("secret", encoding="utf-8")

    def test_resolves_files_inside_base(self):
        self.assertEqual(server.resolve_static(self.base, "index.html"), (self.base / "index.html").resolve())
        self.assertEqual(
            server.resolve_static(self.base, "datasets/_all.js"), (self.base / "datasets" / "_all.js").resolve()
        )

    def test_rejects_paths_outside_base(self):
        self.assertIsNone(server.resolve_static(self.base, "../secret.txt"))
        self.assertIsNone(server.resolve_static(self.base, "..\\secret.txt"))
        self.assertIsNone(server.resolve_static(self.base, str(self.secret)))

    def test_missing_file_and_directory_are_none(self):
        self.assertIsNone(server.resolve_static(self.base, "nope.js"))
        self.assertIsNone(server.resolve_static(self.base, "datasets"))


class ConfigTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)

    def test_defaults_when_file_missing(self):
        config = server.load_config(self.root / "config.json")
        self.assertEqual(config, server.DEFAULT_CONFIG)
        self.assertIsNot(config, server.DEFAULT_CONFIG)

    def test_file_values_override_defaults(self):
        (self.root / "config.json").write_text(json.dumps({"ui_port": 9000}), encoding="utf-8")
        config = server.load_config(self.root / "config.json")
        self.assertEqual(config["ui_port"], 9000)
        self.assertEqual(config["model_port"], server.DEFAULT_CONFIG["model_port"])

    def test_model_path_defaults_to_models_folder(self):
        config = dict(server.DEFAULT_CONFIG)
        self.assertEqual(server.resolve_model_path(config, self.root), self.root / "models" / config["model_file"])

    def test_custom_model_path_wins(self):
        config = dict(server.DEFAULT_CONFIG, model_path="D:\\models\\other.gguf")
        self.assertEqual(server.resolve_model_path(config, self.root), Path("D:\\models\\other.gguf"))


if __name__ == "__main__":
    unittest.main()
