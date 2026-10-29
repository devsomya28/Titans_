# VideoGuard AI — Autonomous Video IP Protection Platform

> **VideoGuard AI** is a production-ready, six-agent AI swarm that autonomously hunts pirated video content across the internet, classifies each incident under IP law, and either dispatches a DMCA takedown or deploys a revenue-sharing smart contract — with human approval required only at the final step.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Agent Pipeline](#agent-pipeline)
- [Tech Stack](#tech-stack)
- [Core Components](#core-components)
- [Database Models](#database-models)
- [Real-Time Layer](#real-time-layer)
- [Evidence Vault & Chain-of-Custody](#evidence-vault--chain-of-custody)
- [API Reference](#api-reference)
- [Environment Variables](#environment-variables)
- [Local Development](#local-development)
- [Deployment](#deployment)
- [Security & Secrets](#security--secrets)

---

## Overview

VideoGuard AI automates the full lifecycle of video copyright enforcement:

1. **Ingest** — Register official content into a FAISS fingerprint vault (1 frame extracted per 30 seconds, embedded via CLIP ViT-B/32)
2. **Hunt** — Spider agent crawls YouTube and other platforms using AI-generated OSINT queries
3. **Detect** — Sentinel agent performs dual-layer visual fingerprinting (CLIP cosine similarity + pHash cross-check)
4. **Adjudicate** — LLM-powered legal classification (SEVERE PIRACY / FAIR USE / FAN CONTENT)
5. **Enforce** — Enforcer drafts tiered DMCA takedown notices (human approval to send)
6. **Monetize** — Broker mints revenue-sharing smart contracts for fair-use content

---

## Architecture

```
React Frontend (Vite + Socket.IO)
        ↕
Node.js Orchestrator (Express · Socket.IO · MongoDB · Redis)
        ↕
FastAPI ML Engine (CLIP · FAISS · yt-dlp · Groq · Gemini)
```

**Data Stores:**

| Store | Purpose |
|---|---|
| MongoDB Atlas | Persistent models — HuntJob, Incident, DMCARecord, ContractRecord, IngestedAsset |
| Redis (Upstash) | Verdict caching, repeat-offender velocity counters (7-day window) |
| FAISS (in-process) | 512-dim CLIP vector index for frame-level similarity search |
| Filesystem `vault/` | FAISS index, vault metadata, evidence artifacts |

---

## Agent Pipeline

### Phase 1 — Archivist 🗄️

**File:** `Backend/agents/archivist.py`

The Archivist is the ingestion agent. It fingerprints official video content and stores embeddings in the FAISS vault for downstream comparison.

**How it works:**
1. Downloads the official video via `yt-dlp` (supports YouTube, Google Drive, direct `.mp4`/`.webm`, Dropbox, S3, CloudFront)
2. Converts Google Drive share URLs to direct download URLs automatically
3. **Extracts 1 frame every 30 seconds** (configurable via `SAMPLE_EVERY_N_SECS`)
4. Resizes each frame to 224px before embedding (reduces memory footprint)
5. Embeds frames in batches of 32 via **CLIP ViT-B/32** (512-dim, L2-normalised)
6. Stores vectors in `IndexFlatIP(512)` FAISS vault with a SHA-256 integrity hash
7. Writes job state atomically to disk (survives process restarts)

**Poll endpoint:** `GET /ingest/status/{job_id}` → `downloading` → `processing` → `complete` / `failed`

---

### Phase 2 — Spider 🕷️

**File:** `Backend/agents/spider.py`

The Spider is the OSINT crawling agent. It discovers suspect streams and re-uploads across platforms.

**How it works:**
1. Accepts the official video URL and optional title
2. If no title provided, uses `yt-dlp` to extract metadata; falls back to URL path parsing on cloud IPs blocked by YouTube bot detection
3. Calls a Groq/Gemini LLM to generate 4 targeted OSINT search queries (e.g. `"champions league final full"`, `"ucl final restream 2024"`)
4. Falls back to rule-based query generation if LLM fails (`{title} full video`, `{title} highlights`, `{title} leaked stream`)
5. Runs each query through `yt-dlp`'s `ytsearch5:` syntax to find up to 5 YouTube results per query
6. Deduplicates results and maps each suspect to a geographic country centroid (30 countries supported)

**LLM model:** `llama-3.1-8b-instant` (Groq) with `gemini-2.0-flash-lite` fallback

**Output:** Up to 20 unique suspect URLs with metadata, saved to `assets/suspects/spider_payload.json`

---

### Phase 3 — Sentinel 👁️

**File:** `Backend/agents/sentinel.py`

The Sentinel is the visual fingerprinting agent that determines whether a suspect video contains stolen content.

**How it works:**
1. Receives all suspect nodes from Spider
2. For each YouTube thumbnail URL, tries 4 resolution variants: `maxresdefault` → `hqdefault` → `mqdefault` → original
3. Embeds each thumbnail via **CLIP ViT-B/32** (512-dim, L2-normalised) — same model used during ingest
4. Searches the FAISS vault using inner product (cosine similarity after L2 normalisation)
5. Keeps the best similarity score across all resolution variants

**Two-Layer Detection:**

| Layer | Method | Threshold | Result |
|---|---|---|---|
| Layer 1 | CLIP cosine similarity | ≥ 0.90 | `CRITICAL` — confirmed match |
| Layer 1 | CLIP cosine similarity | ≥ 0.75 | `WARNING` — suspect, flagged |
| Layer 1 | CLIP cosine similarity | < 0.75 | `INFO` — no match |
| Layer 2 | pHash cross-check | distance < 15 | `phash_match: true` — pixel-level confirmed |

**Batch processing:** `/scan/batch` processes all suspects in parallel using `ThreadPoolExecutor` (8 workers)

**Velocity tracking:** Redis tracks flagged accounts over a 7-day window. Velocity ≥ 3 escalates any severity to `CRITICAL`, catching repeat offenders automatically.

**Output per suspect:**
```json
{
  "match_confirmed": true,
  "confidence_score": 91.4,
  "l2_distance": 0.086,
  "severity": "CRITICAL",
  "phash_match": true,
  "phash_score": 88,
  "top_matches": [{ "vault_index": 47, "similarity": 0.914, "timestamp_sec": 1410 }]
}
```

---

### Phase 4 — Adjudicator ⚖️

**File:** `Backend/agents/adjudicator.py`

The Adjudicator is an LLM-powered legal classification agent that determines piracy vs. fair use and routes the incident to the appropriate next agent.

**How it works:**
1. Only processes incidents with confidence score ≥ 55 (configurable). Lower-confidence suspects are auto-cleared
2. Checks Redis cache first — same `(account, platform, title)` = same ruling. Cache TTL is 24 hours
3. Builds a structured prompt with full incident context: sentinel report, platform, account handle, video title, description, country, confidence score
4. Calls LLM with strict JSON output format

**LLM Fallback Chain:**
1. `llama-3.1-8b-instant` (Groq — 20k TPM, best for batch)
2. `llama-3.3-70b-versatile` (Groq — higher quality, 6k TPM)
3. `gemini-2.0-flash-lite` (Google — last resort)

**Output verdict:**
```json
{
  "classification": "SEVERE PIRACY",
  "risk_score": 87,
  "justification": "Exact broadcast re-stream with identical audio fingerprint...",
  "routing": "Enforcer",
  "legal_basis": "17 U.S.C. § 106 — exclusive reproduction right",
  "recommended_action": "Issue expedited DMCA takedown"
}
```

**Routing:**
- `"Enforcer"` → Phase 5 (DMCA takedown)
- `"Broker"` → Phase 6 (revenue-sharing contract)

---

### Phase 5 — Enforcer 🔨

**File:** `Backend/agents/enforcer.py`

The Enforcer drafts legally compliant DMCA takedown notices for confirmed piracy incidents.

**How it works:**
1. Tracks repeat offences per `(account, platform)` pair in Redis with a 90-day TTL
2. Drafts a full DMCA notice citing **17 U.S.C. § 512(c)** including:
   - Formal header (To/From/Date/Re)
   - Statement of authority and evidence description
   - Reference to FAISS vector proof with integrity hash
   - Tier escalation based on offence history
3. **Human-in-the-loop:** Notices are drafted as `status: "drafted"`. A human must click **"Approve & Send"** in the dashboard before dispatch

**Tier Escalation:**

| Offence | Tier | Action |
|---|---|---|
| 1st | `standard` | Standard DMCA notice |
| 2nd | `expedited` | Cites 17 U.S.C. § 512(i) repeat infringer policy |
| 3rd+ | `legal_referral` | Adds referral to legal counsel |

**Platform Legal Contacts:**
`copyright@youtube.com` · `legal@tiktok.com` · `copyright@twitter.com` · `ip@instagram.com` · `dmca@telegram.org` · `copyright@reddit.com`

---

### Phase 6 — Broker 💰

**File:** `Backend/agents/broker.py`

The Broker handles fair-use and fan-content cases by minting revenue-sharing licensing contracts instead of issuing takedowns.

**How it works:**
1. Calculates content tier based on view count (`Bronze` < 10k · `Silver` 10k–100k · `Gold` 100k–1M · `Platinum` ≥ 1M)
2. Recommends revenue split based on tier and adjudicator risk score
3. Estimates monthly licensing revenue using platform CPM rates (YouTube: $0.60/1000 views · TikTok: $0.004/1000 · Instagram: $0.20/1000, capped at $500/mo)
4. LLM drafts the full smart contract as structured JSON
5. Generates a mock Polygon transaction hash and stores the contract as `status: "minted"`
6. **Human-in-the-loop:** A human must click **"Activate Contract"** to transition to `"active"`

---

## Tech Stack

### ML Backend (FastAPI — Port 8001)

| Component | Technology |
|---|---|
| Web framework | FastAPI + Uvicorn |
| Video download | yt-dlp (with Node.js 20 for YouTube JS extraction) |
| Frame extraction | OpenCV (`opencv-python-headless`) — **1 frame per 30 seconds** |
| Image embedding | CLIP ViT-B/32 (transformers, PyTorch CPU) |
| Vector search | FAISS (`IndexFlatIP` 512-dim, cosine similarity via L2 normalisation) |
| Perceptual hashing | ImageHash (pHash, distance threshold < 15) |
| LLM — primary | Groq (`llama-3.1-8b-instant`, `llama-3.3-70b-versatile`) |
| LLM — fallback | Google Gemini (`gemini-2.0-flash-lite`) |
| Containerisation | Docker (`python:3.11-slim` + Node.js 20) |

### Orchestration Backend (Node.js — Port 8000)

| Component | Technology |
|---|---|
| Web framework | Express.js |
| Real-time | Socket.IO |
| Database | MongoDB (Mongoose ODM) |
| Cache / counters | Redis (ioredis / Upstash) |
| HTTP client | axios |
| ID generation | uuid v4 |

### Frontend (React — Port 5173)

| Component | Technology |
|---|---|
| Framework | React 19 + Vite 8 |
| Routing | React Router v7 |
| Charts | Recharts + Apache ECharts |
| Maps | React Leaflet |
| Animations | Framer Motion |
| Icons | Lucide React |
| Real-time | socket.io-client |
| Notifications | react-hot-toast |
| 3D Globe | Three.js (colorful rotating Earth with Canvas 2D) |
| Typography | Dancing Script (headings) + Inter (body) |

---

## Core Components

```
Backend/
├── main.py                    # FastAPI ML Engine (port 8001)
├── agents/
│   ├── archivist.py           # Ingest & FAISS vault management
│   ├── spider.py              # OSINT crawling & suspect discovery
│   ├── sentinel.py            # Visual fingerprinting (CLIP + pHash)
│   ├── adjudicator.py         # LLM legal classification
│   ├── enforcer.py            # DMCA notice drafting
│   └── broker.py              # Revenue-sharing contract minting
├── server/
│   ├── app.js                 # Node.js Orchestrator (port 8000)
│   ├── controllers/           # Route controllers (swarm, agents, etc.)
│   └── routes/                # Express API routes
└── evidence_vault/
    └── vault.py               # Evidence storage & chain-of-custody

Frontend/
├── src/
│   ├── pages/
│   │   ├── Landing.jsx        # Marketing landing page
│   │   ├── Dashboard.jsx      # Main dashboard
│   │   └── Technology.jsx     # Architecture page
│   └── components/
│       ├── dashboard/
│       │   ├── AssetVault.jsx      # Ingest interface
│       │   ├── ThreatHunter.jsx    # Swarm launch & monitoring
│       │   ├── IncidentTable.jsx   # Filtered incident list
│       │   ├── Analytics.jsx       # Statistics & charts
│       │   └── BrokerPanel.jsx     # Contract management
│       └── landing/
│           ├── HeroSection.jsx     # Hero with 3D globe
│           ├── CobeGlobe.jsx       # Colorful rotating Earth globe
│           ├── Navbar.jsx          # Landing navigation
│           └── CTASection.jsx      # Call-to-action
```

---

## Database Models

All models use Mongoose with MongoDB Atlas.

### `IngestedAsset`
```
official_video_url, title, local_path, frame_count, vault_size,
tx_hash, integrity_hash, status (downloading/processing/complete/failed),
error_message, createdAt
```

### `HuntJob`
```
jobId, official_video_url, status (queued/processing/complete/failed),
official_source {country, coordinates}, threat_count, piracy_count,
fair_use_count, error_message, completed_at, createdAt
```

### `Incident`
```
jobId, title, platform, account_handle, url, thumbnail_url,
country, coordinates {lat, lng}, confidence_score, severity (INFO/WARNING/CRITICAL),
classification (UNREVIEWED/SEVERE PIRACY/FAIR USE/FAN CONTENT),
adjudicator_justification, status (detected/reviewing/takedown_pending/
takedown_sent/monetized/cleared), dmca_record_id, contract_record_id, createdAt
```

### `DMCARecord`
```
incident_id, target_account, platform, confidence_score, notice_text,
integrity_hash, tier (standard/expedited/legal_referral), offence_number,
legal_contact, status (drafted/sent/rejected), sent_at, createdAt
```

### `ContractRecord`
```
incident_id, target_account, platform, video_title,
copyright_holder_share, creator_share, tx_hash, network,
receipt (JSON), integrity_hash, tier (Bronze/Silver/Gold/Platinum),
estimated_monthly_revenue, status (minted/active/disputed), createdAt
```

---

## Real-Time Layer

Node.js uses Socket.IO with named rooms (`hunt:{jobId}`) for isolated event delivery. Multiple concurrent swarms never cross-pollinate events.

### Event Reference

| Event | Direction | Payload |
|---|---|---|
| `swarm:phase` | Server → Client | `{jobId, phase, agent, message}` |
| `swarm:complete` | Server → Client | `{jobId, total_suspects, piracy_count, dmca_drafted, contracts_minted}` |
| `swarm:error` | Server → Client | `{jobId, message}` |
| `spider:complete` | Server → Client | `{jobId, threat_nodes, country_threat_counts, total}` |
| `sentinel:threat_found` | Server → Client | `{incidentId, title, platform, confidence_score, severity, coordinates}` |
| `adjudicator:verdict` | Server → Client | `{incident_id, verdict, next_agent}` |
| `enforcer:notice_ready` | Server → Client | `{incident_id, dmca_id, tier, notice_preview}` |
| `broker:contract_ready` | Server → Client | `{incident_id, contract_id, tier, tx_hash, estimated_monthly_revenue}` |
| `ingest:progress` | Server → Client | `{jobId, assetId, stage, message}` |
| `ingest:complete` | Server → Client | `{jobId, assetId, title, frame_count, vault_size, integrity_hash}` |

---

## Evidence Vault & Chain-of-Custody

Every detection, adjudication, enforcement draft, and broker proposal is recorded immutably in the Evidence Vault.

- Artifacts stored per-evidence under `Backend/vault/evidence/<evidence_id>/`
- Chain-of-custody appended to `Backend/vault/evidence_chain.jsonl`
- Each entry contains: `evidence_id`, `timestamp`, `reviewer`, `metadata`, `artifacts`, `prev_hash`, `entry_hash` (SHA-256)

```python
from evidence_vault import create_evidence

eid, entry = create_evidence(
    artifacts={"raw_video": "/tmp/video.mp4", "metadata": "/tmp/meta.json"},
    metadata={"official_title": "Match X"},
    reviewer="automated_agent",
)
```

---

## API Reference

### FastAPI Endpoints (Port 8001)

| Method | Path | Description |
|---|---|---|
| GET | `/` | Health check + vault size |
| GET | `/vault/status` | FAISS vault status |
| POST | `/ingest` | Start async video ingest (1 frame/30 sec) |
| GET | `/ingest/status/{job_id}` | Poll ingest job status |
| POST | `/hunt` | Crawl for suspects (Spider) |
| POST | `/scan` | Scan single thumbnail |
| POST | `/scan/batch` | Batch scan (parallel, 8 workers) |
| POST | `/adjudicate` | LLM classification |
| POST | `/adjudicate/batch` | Batch LLM classification |
| POST | `/enforce` | Draft DMCA notice |
| POST | `/broker` | Mint rev-share contract |
| GET | `/debug/cookies` | Cookie configuration check |
| GET | `/debug/sentinel` | Raw similarity scan |

### Node.js Routes (Port 8000)

| Method | Path | Description |
|---|---|---|
| POST | `/api/swarm/run` | Launch full 6-phase autonomous swarm |
| POST | `/api/ingest` | Ingest official video |
| GET | `/api/ingest` | List ingested assets |
| DELETE | `/api/ingest/:id` | Delete asset and vectors |
| POST | `/api/scan/batch` | Batch scan |
| GET | `/api/incidents` | List incidents with filters |
| POST | `/api/adjudicate/batch` | Batch adjudicate |
| PATCH | `/api/enforce/:id/approve` | Approve & send DMCA |
| PATCH | `/api/enforce/:id/reject` | Reject DMCA |
| POST | `/api/broker` | Mint contract |
| PATCH | `/api/broker/:id/activate` | Activate contract |
| GET | `/api/health` | Full system health check |

---

## Environment Variables

### `Backend/.env`

```env
# Database
MONGODB_URI=mongodb+srv://...

# Redis (optional — system degrades gracefully without it)
REDIS_URL=redis://...

# LLM APIs (at least one required)
GROQ_API_KEY=gsk_...
GEMINI_API_KEY=AIza...

# Service URLs
FASTAPI_URL=http://localhost:8001
CLIENT_URL=https://your-frontend.web.app

# YouTube cookies (optional — helps bypass bot detection on cloud IPs)
# Base64-encoded Netscape cookie file: base64 -w 0 cookies.txt
YOUTUBE_COOKIES_B64=...

NODE_ENV=production
```

### `Frontend/.env.production`

```env
VITE_API_URL=https://your-node-backend.onrender.com
```

---

## Local Development

### Prerequisites
- Python 3.11+
- Node.js 20+
- MongoDB (local or Atlas)
- Redis (local or Upstash cloud)

### Setup

**1. Clone**
```bash
git clone https://github.com/SANSKRITI01717/Titans.git
cd Titans
```

**2. FastAPI ML Engine**
```bash
cd Backend
python -m venv .venv

# Windows
.venv\Scripts\activate
# macOS / Linux
# source .venv/bin/activate

pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
pip install -r requirements.txt
uvicorn main:app --host 127.0.0.1 --port 8001 --reload
```

**3. Node.js Orchestrator**
```bash
cd Backend/server
npm install
node app.js
# or: node --watch app.js  (for auto-reload)
```

**4. React Frontend**
```bash
cd Frontend
npm install
npm run dev
```

**Services:**
| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Node.js API | http://localhost:8000 |
| FastAPI ML | http://localhost:8001 |

> **Note:** The ML engine requires significant CPU/RAM for PyTorch and FAISS. For production use GPU-backed instances or a scaled inference service.

---

## Deployment

### Current Setup

| Service | Platform |
|---|---|
| Frontend | Firebase Hosting |
| Node.js API | Render (or any Node.js host) |
| FastAPI ML | Render (or any Python host) |
| Database | MongoDB Atlas |
| Cache | Redis Cloud (Upstash) |

### Firebase Hosting (Frontend)
```bash
cd Frontend
npm run build
npx firebase-tools deploy --only hosting
```

### Render (Backend)
Push to `main` branch — Render auto-deploys from the configured Dockerfile path.

> **Free Tier Note:** Both backend services on Render's free tier sleep after 15 minutes of inactivity. The Node.js server includes a self-ping keepalive every 14 minutes. Set `RENDER_EXTERNAL_URL` to enable it.

---

## Security & Secrets

> ⚠️ **Priority:** Rotate any exposed API keys immediately and remove secrets from git history.

- Move all secrets to a managed secret store (Render Secrets, GitHub Actions Secrets, AWS Secrets Manager)
- Add `.env` to `.gitignore` and verify it is not committed
- Add secret scanning to CI (git-secrets, truffleHog, or GitHub's native secret scanning)
- Keep **human-in-the-loop approval enforced** for all DMCA dispatches and contract activations in production

---

## License

This project is open source. All automated enforcement actions require explicit human approval before execution.
