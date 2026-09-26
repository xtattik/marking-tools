import tempfile
import unittest
from pathlib import Path
from unittest import mock

import support  # noqa: F401
import setup_helper

RELEASES = [
    {"tag_name": "b3", "assets": [{"name": "llama-b3-bin-macos-arm64.tar.gz", "browser_download_url": "u-mac"}]},
    {
        "tag_name": "b2",
        "assets": [
            {"name": "cudart-llama-bin-win-cuda-12.4-x64.zip", "browser_download_url": "u-cudart"},
            {"name": "llama-b2-bin-win-cpu-arm64.zip", "browser_download_url": "u-arm"},
            {"name": "llama-b2-bin-win-cpu-x64.zip", "browser_download_url": "u-cpu"},
        ],
    },
    {"tag_name": "b1", "assets": [{"name": "llama-b1-bin-win-cpu-x64.zip", "browser_download_url": "u-old"}]},
]


class PickLlamaAssetTests(unittest.TestCase):
    def test_picks_newest_release_with_windows_cpu_x64_build(self):
        self.assertEqual(setup_helper.pick_llama_asset(RELEASES), ("b2", "u-cpu"))

    def test_none_when_no_matching_asset(self):
        self.assertIsNone(setup_helper.pick_llama_asset(RELEASES[:1]))
        self.assertIsNone(setup_helper.pick_llama_asset([]))


class FindFileSizeTests(unittest.TestCase):
    TREE = [
        {"type": "file", "path": "README.md", "size": 10},
        {"type": "file", "path": "gemma-4-E2B-it-Q4_K_M.gguf", "size": 3106738272},
    ]

    def test_finds_size(self):
        self.assertEqual(setup_helper.find_file_size(self.TREE, "gemma-4-E2B-it-Q4_K_M.gguf"), 3106738272)

    def test_missing_is_none(self):
        self.assertIsNone(setup_helper.find_file_size(self.TREE, "other.gguf"))


class NeedsDownloadTests(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.file = Path(tmp.name) / "model.gguf"

    def test_missing_file_needs_download(self):
        self.assertTrue(setup_helper.needs_download(self.file, 5))

    def test_wrong_size_needs_download(self):
        self.file.write_bytes(b"abc")
        self.assertTrue(setup_helper.needs_download(self.file, 5))

    def test_matching_size_is_current(self):
        self.file.write_bytes(b"abcde")
        self.assertFalse(setup_helper.needs_download(self.file, 5))

    def test_unknown_size_trusts_existing_file(self):
        self.file.write_bytes(b"abc")
        self.assertFalse(setup_helper.needs_download(self.file, None))


def fake_response(headers, chunks):
    response = mock.MagicMock()
    response.headers = headers
    response.read.side_effect = chunks
    response.__enter__.return_value = response
    response.__exit__.return_value = False
    return response


class DownloadTests(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.dest = Path(tmp.name) / "model.gguf"
        self.part = self.dest.with_name(self.dest.name + ".part")

    def test_truncated_download_leaves_part_file_and_raises(self):
        response = fake_response({"Content-Length": "10"}, [b"abcd", b""])
        with mock.patch("setup_helper.urllib.request.urlopen", return_value=response):
            with self.assertRaises(OSError):
                setup_helper.download("http://example/file", self.dest)
        self.assertFalse(self.dest.exists())
        self.assertTrue(self.part.exists())

    def test_complete_download_replaces_dest_and_removes_part(self):
        response = fake_response({"Content-Length": "5"}, [b"abcde", b""])
        with mock.patch("setup_helper.urllib.request.urlopen", return_value=response):
            setup_helper.download("http://example/file", self.dest, expected_size=5)
        self.assertTrue(self.dest.exists())
        self.assertEqual(self.dest.read_bytes(), b"abcde")
        self.assertFalse(self.part.exists())


class SwapInTests(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.root = Path(tmp.name)

    def test_successful_swap_replaces_contents_and_removes_backup(self):
        final = self.root / "llama.cpp"
        final.mkdir()
        (final / "old.txt").write_text("old")
        staging = self.root / "llama.cpp.new"
        staging.mkdir()
        (staging / "new.txt").write_text("new")

        setup_helper.swap_in(staging, final)

        self.assertTrue((final / "new.txt").is_file())
        self.assertFalse((final / "old.txt").exists())
        self.assertFalse(staging.exists())
        self.assertFalse(final.with_name(final.name + ".old").exists())

    def test_failed_swap_restores_original(self):
        final = self.root / "llama.cpp"
        final.mkdir()
        (final / "old.txt").write_text("old")
        staging = self.root / "does-not-exist"

        with self.assertRaises(OSError):
            setup_helper.swap_in(staging, final)

        self.assertTrue(final.is_dir())
        self.assertTrue((final / "old.txt").is_file())
        self.assertFalse(final.with_name(final.name + ".old").exists())


if __name__ == "__main__":
    unittest.main()
