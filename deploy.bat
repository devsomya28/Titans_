@echo off
REM ═══════════════════════════════════════════════════════════════════════════════
REM MediaGuard — Deploy to GCP Cloud Run
REM ═══════════════════════════════════════════════════════════════════════════════
REM
REM Before running this, ensure:
REM   1. setup_models.bat has been run (models uploaded to GCS)
REM   2. Secrets created in Secret Manager (see DEPLOYMENT.md Step 3)
REM   3. gcloud CLI authenticated and project set
REM   4. Docker Desktop running
REM
REM ═══════════════════════════════════════════════════════════════════════════════

setlocal enabledelayedexpansion

for /f "tokens=*" %%i in ('gcloud config get-value project 2^>nul') do set PROJECT_ID=%%i
set REGION=us-central1
set REPO=mediaguard
set BUCKET=mediaguard-models

echo.
echo ══════════════════════════════════════════════════════
echo   MediaGuard — GCP Cloud Run Deployment
echo ══════════════════════════════════════════════════════
echo   Project: %PROJECT_ID%
echo   Region:  %REGION%
echo ══════════════════════════════════════════════════════
echo.

REM ── Enable APIs ────────────────────────────────────────────────────────────
echo [1/7] Enabling APIs...
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com storage.googleapis.com secretmanager.googleapis.com --project=%PROJECT_ID% --quiet
echo   Done.
echo.

REM ── Artifact Registry ──────────────────────────────────────────────────────
echo [2/7] Artifact Registry...
gcloud artifacts repositories describe %REPO% --location=%REGION% --project=%PROJECT_ID% >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    gcloud artifacts repositories create %REPO% --repository-format=docker --location=%REGION% --project=%PROJECT_ID%
)
gcloud auth configure-docker %REGION%-docker.pkg.dev --quiet
echo   Done.
echo.

REM ── Build FastAPI ──────────────────────────────────────────────────────────
echo [3/7] Building FastAPI image (~15 min first time)...
docker build -t %REGION%-docker.pkg.dev/%PROJECT_ID%/%REPO%/mediaguard-fastapi:latest -f Backend\Dockerfile.fastapi Backend\
if %ERRORLEVEL% NEQ 0 (echo BUILD FAILED & pause & exit /b 1)
echo   Done.
echo.

REM ── Build Node.js ──────────────────────────────────────────────────────────
echo [4/7] Building Node.js image...
docker build -t %REGION%-docker.pkg.dev/%PROJECT_ID%/%REPO%/mediaguard-node:latest -f Backend\Dockerfile.node Backend\
if %ERRORLEVEL% NEQ 0 (echo BUILD FAILED & pause & exit /b 1)
echo   Done.
echo.

REM ── Push ───────────────────────────────────────────────────────────────────
echo [5/7] Pushing images...
docker push %REGION%-docker.pkg.dev/%PROJECT_ID%/%REPO%/mediaguard-fastapi:latest
docker push %REGION%-docker.pkg.dev/%PROJECT_ID%/%REPO%/mediaguard-node:latest
echo   Done.
echo.

REM ── Deploy FastAPI ─────────────────────────────────────────────────────────
echo [6/7] Deploying FastAPI to Cloud Run...
gcloud run deploy mediaguard-fastapi ^
    --image=%REGION%-docker.pkg.dev/%PROJECT_ID%/%REPO%/mediaguard-fastapi:latest ^
    --region=%REGION% --project=%PROJECT_ID% --platform=managed ^
    --memory=4Gi --cpu=2 --timeout=900 --concurrency=10 ^
    --min-instances=1 --max-instances=5 --port=8001 ^
    --allow-unauthenticated ^
    --set-env-vars="MODEL_GCS_BUCKET=%BUCKET%,PORT=8001,NODE_ENV=production,WATCHDOG_ENABLED=true,WATCHDOG_INTERVAL_HOURS=0.5,WATCHDOG_ALERT_THRESHOLD=25" ^
    --set-secrets="GEMINI_API_KEY=mediaguard-gemini-key:latest,GROQ_API_KEY=mediaguard-groq-key:latest,MONGO_URI=mediaguard-mongo-uri:latest,REDIS_URL=mediaguard-redis-url:latest"

for /f "tokens=*" %%i in ('gcloud run services describe mediaguard-fastapi --region=%REGION% --project=%PROJECT_ID% --format="value(status.url)"') do set FASTAPI_URL=%%i
echo   FastAPI: %FASTAPI_URL%

REM Update FASTAPI_URL secret
echo %FASTAPI_URL%| gcloud secrets versions add mediaguard-fastapi-url --data-file=- 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo %FASTAPI_URL%| gcloud secrets create mediaguard-fastapi-url --data-file=-
)
echo.

REM ── Deploy Node.js ─────────────────────────────────────────────────────────
echo [7/7] Deploying Node.js to Cloud Run...
gcloud run deploy mediaguard-node ^
    --image=%REGION%-docker.pkg.dev/%PROJECT_ID%/%REPO%/mediaguard-node:latest ^
    --region=%REGION% --project=%PROJECT_ID% --platform=managed ^
    --memory=1Gi --cpu=1 --timeout=300 --concurrency=80 ^
    --min-instances=1 --max-instances=10 --port=8000 ^
    --allow-unauthenticated ^
    --set-env-vars="NODE_ENV=production,NODE_PORT=8000,CLIENT_URL=https://mediaguard-sports.web.app" ^
    --set-secrets="GEMINI_API_KEY=mediaguard-gemini-key:latest,GROQ_API_KEY=mediaguard-groq-key:latest,MONGO_URI=mediaguard-mongo-uri:latest,REDIS_URL=mediaguard-redis-url:latest,FASTAPI_URL=mediaguard-fastapi-url:latest"

for /f "tokens=*" %%i in ('gcloud run services describe mediaguard-node --region=%REGION% --project=%PROJECT_ID% --format="value(status.url)"') do set NODE_URL=%%i
echo   Node.js: %NODE_URL%
echo.

echo ══════════════════════════════════════════════════════
echo   DEPLOYED
echo ══════════════════════════════════════════════════════
echo.
echo   FastAPI: %FASTAPI_URL%
echo   Node.js: %NODE_URL%
echo.
echo   Next:
echo   1. Edit Frontend\.env.production:
echo      VITE_API_URL=%NODE_URL%
echo   2. cd Frontend ^& npm run build ^& firebase deploy
echo.
echo   Test:
echo   curl %FASTAPI_URL%/health
echo   curl %NODE_URL%/api/health
echo ══════════════════════════════════════════════════════
pause
