import tempfile
import unittest
from pathlib import Path

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


if __name__ == "__main__":
    unittest.main()
