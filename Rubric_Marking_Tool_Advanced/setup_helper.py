"""Downloads or updates llama.cpp and the model for the Advanced Marking Tool.

Run by setup.bat using the portable Python. Standard library only. Only
downloads what is missing or out of date.
"""
import json
import shutil
import sys
import urllib.error
import urllib.request
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))  # the embeddable Python doesn't add the script folder
from server import load_config, resolve_model_path  # noqa: E402

BIN = ROOT / "bin"
LLAMA_DIR = BIN / "llama.cpp"
VERSION_FILE = LLAMA_DIR / "VERSION"
# llama.cpp marks its builds as prereleases, so /releases/latest is wrong; scan the list.
RELEASES_API = "https://api.github.com/repos/ggml-org/llama.cpp/releases?per_page=20"
ASSET_SUFFIX = "-bin-win-cpu-x64.zip"
HEADERS = {"User-Agent": "rubric-marking-tool-setup"}


def pick_llama_asset(releases):
    """Return (tag, download_url) of the newest Windows CPU x64 build, or None."""
    for release in releases:
        for asset in release.get("assets", []):
            name = asset.get("name", "")
            if name.startswith("llama-") and name.endswith(ASSET_SUFFIX):
                return release["tag_name"], asset["browser_download_url"]
    return None


def find_file_size(tree, filename):
    for entry in tree:
        if entry.get("path") == filename:
            return entry.get("size")
    return None


def needs_download(path, expected_size):
    if not path.is_file():
        return True
    return expected_size is not None and path.stat().st_size != expected_size


def fetch_json(url):
    request = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.load(response)


def download(url, dest, expected_size=None):
    """Stream url to dest via a .part file so an interrupted download never looks complete."""
    dest.parent.mkdir(parents=True, exist_ok=True)
    part = dest.with_name(dest.name + ".part")
    request = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(request, timeout=60) as response, open(part, "wb") as out:
        try:
            total = int(response.headers.get("Content-Length") or 0)
        except (TypeError, ValueError):
            total = 0
        done = 0
        while chunk := response.read(1024 * 1024):
            out.write(chunk)
            done += len(chunk)
            if total:
                print(f"\r  {done // 2**20} / {total // 2**20} MB", end="", flush=True)
    print()
    if (expected_size is not None and done != expected_size) or (total and done != total):
        raise OSError(f"download incomplete ({done} of {expected_size or total} bytes)")
    part.replace(dest)


def swap_in(staging, final):
    """Replace `final` with `staging`, restoring the old copy if the swap fails."""
    backup = final.with_name(final.name + ".old")
    shutil.rmtree(backup, ignore_errors=True)
    if final.exists():
        final.rename(backup)
    try:
        staging.rename(final)
    except OSError:
        if backup.exists() and not final.exists():
            backup.rename(final)
        raise
    shutil.rmtree(backup, ignore_errors=True)


def update_llama():
    """Returns 'updated', 'current', 'offline' or 'error'."""
    installed = VERSION_FILE.read_text().strip() if VERSION_FILE.is_file() else None
    has_exe = (LLAMA_DIR / "llama-server.exe").is_file()
    try:
        picked = pick_llama_asset(fetch_json(RELEASES_API))
    except (urllib.error.URLError, OSError, ValueError) as exc:
        if has_exe:
            print(f"[skip] llama.cpp: could not check for updates ({exc}); keeping {installed}.")
            return "offline"
        print(f"[error] llama.cpp: could not download ({exc}).")
        return "error"
    if picked is None:
        print("[error] llama.cpp: no Windows CPU build found in recent releases.")
        return "current" if has_exe else "error"

    tag, url = picked
    if has_exe and installed == tag:
        print(f"[ok] llama.cpp {tag} is up to date.")
        return "current"

    print(f"Downloading llama.cpp {tag} ...")
    zip_path = BIN / "llama.zip"
    staging = BIN / "llama.cpp.new"
    try:
        download(url, zip_path)
        shutil.rmtree(staging, ignore_errors=True)
        with zipfile.ZipFile(zip_path) as archive:
            archive.extractall(staging)
        if not (staging / "llama-server.exe").is_file():
            raise RuntimeError("llama-server.exe was not in the download")
        (staging / "VERSION").write_text(tag)
        swap_in(staging, LLAMA_DIR)
    except PermissionError:
        print("[error] llama.cpp: files are in use. Close the Advanced Marking Tool window and run setup again.")
        return "error"
    except (urllib.error.URLError, OSError, zipfile.BadZipFile, RuntimeError) as exc:
        print(f"[error] llama.cpp: {exc}")
        return "error"
    finally:
        zip_path.unlink(missing_ok=True)
    print(f"[ok] llama.cpp {tag} installed.")
    return "updated"


def update_model(config):
    """Returns 'updated', 'current', 'offline' or 'error'."""
    target = resolve_model_path(config, ROOT)
    if str(config.get("model_path") or "").strip():
        if target.is_file():
            print(f"[skip] Model: using model_path from config.json ({target}).")
            return "current"
        print(f"[error] Model: model_path in config.json points to a missing file ({target}).")
        return "error"

    repo, filename = config["model_repo"], config["model_file"]
    try:
        expected = find_file_size(fetch_json(f"https://huggingface.co/api/models/{repo}/tree/main"), filename)
    except (urllib.error.URLError, OSError, ValueError) as exc:
        if target.is_file():
            print(f"[skip] Model: could not check for updates ({exc}); keeping {filename}.")
            return "offline"
        print(f"[error] Model: could not download ({exc}).")
        return "error"
    if expected is None:
        print(f"[error] Model: {filename} was not found in {repo}.")
        return "error"
    if not needs_download(target, expected):
        print(f"[ok] Model {filename} is present.")
        return "current"

    print(f"Downloading {filename} ({expected // 2**20} MB) - this takes a while ...")
    try:
        download(f"https://huggingface.co/{repo}/resolve/main/{filename}", target, expected)
    except (urllib.error.URLError, OSError) as exc:
        print(f"[error] Model: download failed ({exc}). Run setup again to retry.")
        return "error"
    if needs_download(target, expected):
        target.unlink(missing_ok=True)
        print("[error] Model: downloaded file is the wrong size. Run setup again to retry.")
        return "error"
    print(f"[ok] Model {filename} installed.")
    return "updated"


def main():
    config = load_config(ROOT / "config.json")
    results = [update_llama(), update_model(config)]
    print()
    if "error" in results:
        print("Setup finished with errors - see above.")
        return 1
    if all(result == "current" for result in results):
        print("Everything up to date.")
    else:
        print("Setup complete. Double-click 'Open Advanced Marking Tool.bat' to start.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
