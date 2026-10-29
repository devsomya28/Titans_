@echo off
REM ═══════════════════════════════════════════════════════════════════════════════
REM MediaGuard — Download, Generate, and Upload ALL Model Files
REM ═══════════════════════════════════════════════════════════════════════════════
REM
REM Steps:
REM   1. Downloads best.pth from Google Drive
REM   2. Generates clip_vision.onnx from HuggingFace CLIP
REM   3. Uploads both to GCS (gs://mediaguard-models/models/)
REM
REM Run this ONCE before deploy.bat
REM ═══════════════════════════════════════════════════════════════════════════════

setlocal
set BUCKET=mediaguard-models
set BDIR=%~dp0Backend

echo.
echo ══════════════════════════════════════════════════════
echo   MediaGuard — Model Setup
echo ══════════════════════════════════════════════════════
echo.

REM ── Step 1: best.pth ───────────────────────────────────────────────────────
echo [1/3] best.pth (~1.12GB) — SND Forensics Model
echo.

if exist "%BDIR%\best.pth" (
    echo   Already exists. Skipping download.
) else (
    echo   Downloading from Google Drive...
    pip install gdown -q 2>nul
    python -c "import gdown; gdown.download('https://drive.google.com/uc?id=1WqoulPa3UKY29EDGNRPS4S83eNdH0JNY', r'%BDIR%\best.pth', quiet=False, fuzzy=True)"
    if not exist "%BDIR%\best.pth" (
        echo   FAILED. Download manually from:
        echo   https://drive.google.com/drive/folders/1mJZufg5iRpAXRckFpNYBv9Oe1f_b8jIk
        pause
        exit /b 1
    )
    echo   Done.
)
echo.

REM ── Step 2: clip_vision.onnx ───────────────────────────────────────────────
echo [2/3] clip_vision.onnx (~350MB) — CLIP ONNX (7x faster inference)
echo.

if exist "%BDIR%\clip_vision.onnx" (
    echo   Already exists. Skipping generation.
) else (
    echo   Generating from HuggingFace CLIP ViT-B/32...
    echo   (Downloads ~350MB model then exports to ONNX, takes 2-5 min)
    echo.
    pip install onnx onnxruntime -q 2>nul
    python "%BDIR%\export_clip_onnx.py"
    if not exist "%BDIR%\clip_vision.onnx" (
        echo   FAILED. Install: pip install transformers torch onnx onnxruntime
        echo   Then run: python Backend\export_clip_onnx.py
        pause
        exit /b 1
    )
    echo   Done.
)
echo.

REM ── Step 3: Upload to GCS ──────────────────────────────────────────────────
echo [3/3] Uploading to gs://%BUCKET%/models/
echo.

where gsutil >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo   gsutil not found. Install Google Cloud SDK:
    echo   https://cloud.google.com/sdk/docs/install
    pause
    exit /b 1
)

gsutil ls -b gs://%BUCKET% >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    gsutil mb -l us-central1 -c STANDARD gs://%BUCKET%
)

echo   Uploading best.pth...
gsutil -o GSUtil:parallel_composite_upload_threshold=150M cp "%BDIR%\best.pth" gs://%BUCKET%/models/best.pth

echo   Uploading clip_vision.onnx...
gsutil -o GSUtil:parallel_composite_upload_threshold=150M cp "%BDIR%\clip_vision.onnx" gs://%BUCKET%/models/clip_vision.onnx

echo.
echo ══════════════════════════════════════════════════════
echo   Done! Files on GCS:
echo ══════════════════════════════════════════════════════
gsutil ls -l gs://%BUCKET%/models/
echo.
echo   Next: run deploy.bat
echo ══════════════════════════════════════════════════════
pause
