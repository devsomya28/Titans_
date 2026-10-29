"""
MediaGuard — Download Models from GCS
======================================
Used by entrypoint.sh on Cloud Run to download model files on container startup.
Can also be run locally to verify model status.

Usage:
  python download_models.py           # download missing models
  python download_models.py --check   # just check status
"""

import os
import sys
import time

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BUCKET = os.environ.get("MODEL_GCS_BUCKET", "mediaguard-models")

MODELS = [
    {
        "name": "best.pth",
        "path": os.path.join(BASE_DIR, "best.pth"),
        "gcs_key": "models/best.pth",
        "min_bytes": 100_000_000,
        "required": True,
    },
    {
        "name": "clip_vision.onnx",
        "path": os.path.join(BASE_DIR, "clip_vision.onnx"),
        "gcs_key": "models/clip_vision.onnx",
        "min_bytes": 50_000_000,
        "required": False,  # PyTorch fallback works without this
    },
]


def is_valid(model):
    return os.path.exists(model["path"]) and os.path.getsize(model["path"]) >= model["min_bytes"]


def download_gcs(model):
    """Download from GCS using Python client."""
    try:
        from google.cloud import storage
        client = storage.Client()
        bucket = client.bucket(BUCKET)
        blob = bucket.blob(model["gcs_key"])
        if not blob.exists():
            return False
        print(f"  Downloading gs://{BUCKET}/{model['gcs_key']}...")
        start = time.time()
        blob.download_to_filename(model["path"])
        mb = os.path.getsize(model["path"]) / 1e6
        sec = time.time() - start
        print(f"  Done ({mb:.0f}MB in {sec:.1f}s)")
        return True
    except Exception as e:
        print(f"  GCS failed: {e}")
        return False


def download_drive(model):
    """Fallback: download best.pth from Google Drive."""
    if model["name"] != "best.pth":
        return False
    try:
        import gdown
        drive_id = os.environ.get("FORENSICS_DRIVE_ID", "1WqoulPa3UKY29EDGNRPS4S83eNdH0JNY")
        print(f"  Downloading from Google Drive...")
        gdown.download(f"https://drive.google.com/uc?id={drive_id}", model["path"], quiet=False)
        return is_valid(model)
    except Exception as e:
        print(f"  Drive failed: {e}")
        return False


def generate_onnx(model):
    """Generate clip_vision.onnx from HuggingFace CLIP."""
    if model["name"] != "clip_vision.onnx":
        return False
    script = os.path.join(BASE_DIR, "export_clip_onnx.py")
    if not os.path.exists(script):
        return False
    try:
        import subprocess
        print(f"  Generating ONNX from CLIP ViT-B/32...")
        result = subprocess.run([sys.executable, script], timeout=300)
        return result.returncode == 0 and is_valid(model)
    except Exception as e:
        print(f"  Generation failed: {e}")
        return False


def ensure_model(model):
    if is_valid(model):
        mb = os.path.getsize(model["path"]) / 1e6
        print(f"  ✓ {model['name']} ({mb:.0f}MB)")
        return True

    print(f"\n  ⬇ {model['name']}")

    # Try GCS first
    if download_gcs(model) and is_valid(model):
        return True

    # Fallback: Drive for best.pth, generate for ONNX
    if model["name"] == "best.pth":
        if download_drive(model) and is_valid(model):
            return True
    elif model["name"] == "clip_vision.onnx":
        if generate_onnx(model) and is_valid(model):
            return True

    if model["required"]:
        print(f"  ✗ {model['name']} — FAILED (required)")
        return False
    else:
        print(f"  ⚠ {model['name']} — not available (optional, using PyTorch fallback)")
        return True


def main():
    check_only = "--check" in sys.argv

    print("=" * 50)
    print("  MediaGuard — Model Status")
    print(f"  GCS: gs://{BUCKET}")
    print("=" * 50)

    all_ok = True
    for model in MODELS:
        if check_only:
            if is_valid(model):
                mb = os.path.getsize(model["path"]) / 1e6
                print(f"  ✓ {model['name']} ({mb:.0f}MB)")
            else:
                tag = "MISSING" if model["required"] else "MISSING (optional)"
                print(f"  ✗ {model['name']} — {tag}")
                if model["required"]:
                    all_ok = False
        else:
            if not ensure_model(model):
                all_ok = False

    print("=" * 50)
    return 0 if all_ok else 1


if __name__ == "__main__":
    sys.exit(main())
