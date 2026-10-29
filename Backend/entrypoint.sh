#!/bin/bash
set -e

echo "============================================="
echo "  MediaGuard FastAPI — Container Startup"
echo "============================================="

# ── Download models from GCS if not already present ──────────────────────────
MODEL_DIR="/app"
BUCKET="${MODEL_GCS_BUCKET:-mediaguard-models}"

download_from_gcs() {
    local file_name=$1
    local gcs_path=$2
    local local_path="${MODEL_DIR}/${file_name}"
    local min_size=$3  # minimum valid size in bytes

    if [ -f "$local_path" ]; then
        local size=$(stat -f%z "$local_path" 2>/dev/null || stat -c%s "$local_path" 2>/dev/null || echo "0")
        if [ "$size" -gt "$min_size" ]; then
            echo "  ✓ ${file_name} already present (${size} bytes)"
            return 0
        fi
        echo "  ✗ ${file_name} exists but too small — re-downloading"
        rm -f "$local_path"
    fi

    echo "  ⬇ Downloading ${file_name} from gs://${BUCKET}/${gcs_path}..."
    
    # Try gsutil first (fastest, supports parallel composite downloads)
    if command -v gsutil &> /dev/null; then
        if gsutil -m cp "gs://${BUCKET}/${gcs_path}" "$local_path" 2>/dev/null; then
            echo "  ✓ ${file_name} downloaded via gsutil"
            return 0
        fi
    fi

    # Fallback: Python GCS client
    python3 -c "
from google.cloud import storage
import sys
try:
    client = storage.Client()
    bucket = client.bucket('${BUCKET}')
    blob = bucket.blob('${gcs_path}')
    blob.download_to_filename('${local_path}')
    print('  ✓ ${file_name} downloaded via Python GCS client')
except Exception as e:
    print(f'  ✗ GCS download failed: {e}')
    sys.exit(1)
" 2>/dev/null && return 0

    # Fallback: gdown from Google Drive
    if [ -n "$FORENSICS_DRIVE_ID" ] && [ "$file_name" = "best.pth" ]; then
        echo "  ⬇ Trying Google Drive fallback..."
        python3 -c "
import gdown, os
gdown.download(f'https://drive.google.com/uc?id=${FORENSICS_DRIVE_ID}', '${local_path}', quiet=False)
" 2>/dev/null && return 0
    fi

    echo "  ⚠ Could not download ${file_name} — system will use fallback mode"
    return 1
}

echo ""
echo "  Checking model files..."
echo "  GCS Bucket: ${BUCKET}"
echo ""

# Download best.pth (Forensics SND model ~1.12GB)
download_from_gcs "best.pth" "models/best.pth" 100000000

# Download clip_vision.onnx (CLIP ONNX model ~353MB) — OPTIONAL
# If not on GCS, system falls back to PyTorch CLIP (slower but works fine)
download_from_gcs "clip_vision.onnx" "models/clip_vision.onnx" 50000000
if [ ! -f "${MODEL_DIR}/clip_vision.onnx" ] || [ $(stat -c%s "${MODEL_DIR}/clip_vision.onnx" 2>/dev/null || echo "0") -lt 50000000 ]; then
    echo "  ⚙ clip_vision.onnx not on GCS — generating from HuggingFace CLIP..."
    python3 /app/export_clip_onnx.py 2>/dev/null || echo "  ⚠ ONNX export failed — using PyTorch fallback (still works, just slower)"
fi

# Download clip_vision.onnx.data (ONNX external data ~350MB) — OPTIONAL
# Only needed if ONNX was exported with external data format
download_from_gcs "clip_vision.onnx.data" "models/clip_vision.onnx.data" 50000000

# Set environment variables for model paths
export FORENSICS_MODEL_PATH="${MODEL_DIR}/best.pth"
export CLIP_ONNX_PATH="${MODEL_DIR}/clip_vision.onnx"

echo ""
echo "  Model paths:"
echo "    FORENSICS_MODEL_PATH=${FORENSICS_MODEL_PATH}"
echo "    CLIP_ONNX_PATH=${CLIP_ONNX_PATH}"
echo "============================================="
echo ""

# ── Run the application ──────────────────────────────────────────────────────
exec "$@"
