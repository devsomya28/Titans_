# MediaGuard / SportGuard AI — Link Resolver Results & Platform Verification

## 1. Overview & Setup

- **yt-dlp Version**: `2026.10.26` (Updated & verified via `pip install -U yt-dlp`)
- **Execution Mode**: Local Python 3.14 + FastAPI (`http://127.0.0.1:8001`) + Node.js Express (`http://127.0.0.1:8000`) + React Vite Frontend (`http://127.0.0.1:5173`)
- **Extraction Policy**: Metadata extraction only (`skip_download=True`, 10s socket timeout, 1 retry). No cookies, no credentials, no CAPTCHA/bot evasion, no proxy rotation.
- **UI Label**: **"Link Resolve"** (distinguished from keyword search).

---

## 2. Platform Verification Results Table (3 Real Public Sports URLs per Platform)

| Platform | Test Public URL | Status | Error Details | Elapsed Time |
| :--- | :--- | :--- | :--- | :--- |
| **X / Twitter** | `https://x.com/NBA/status/1785124233159344400` | **RESOLVES** | `None` (Title: *The @pacers take a 3-1 series lead!*, Uploader: *NBA*, Duration: *13.93s*, Thumbnail: *pbs.twimg.com/media/GMbuEaAWgAA8tXp.jpg*) | 1.46s |
| **X / Twitter** | `https://x.com/premierleague/status/1784931362699563228` | **RESOLVES** | `None` (Title: *Bukayo Saka was a menace on the counter-attack*, Uploader: *Premier League*, Duration: *13.93s*, Thumbnail: *pbs.twimg.com/media/GMY_16bWwAAcO-N.jpg*) | 1.42s |
| **X / Twitter** | `https://x.com/espn/status/1785509930777121271` | **RESOLVES** | `None` (Title: *Tyrese Maxey tonight: 46 PTS 9 AST 5 REB 7 3PM CLUTCH.*, Uploader: *ESPN*, Duration: *13.93s*, Thumbnail: *pbs.twimg.com/media/GMdLCd_WEAAtz-j.jpg*) | 1.37s |
| **TikTok** | `https://www.tiktok.com/@nba/video/7363486161108258090` | **BLOCKED** | `ERROR: [TikTok] 7363486161108258090: Unable to download webpage: Failed to perform, curl: (28) Connection timed out after 10009 milliseconds (caused by TransportError)` | 21.06s |
| **TikTok** | `https://www.tiktok.com/@nba/video/7361250269094251822` | **BLOCKED** | `ERROR: [TikTok] 7361250269094251822: Unable to download webpage: Failed to perform, curl: (28) Connection timed out after 10006 milliseconds (caused by TransportError)` | 21.05s |
| **TikTok** | `https://www.tiktok.com/@nba/video/7365342410389146922` | **BLOCKED** | `ERROR: [TikTok] 7365342410389146922: Unable to download webpage: Failed to perform, curl: (28) Connection timed out after 10014 milliseconds (caused by TransportError)` | 21.05s |
| **Facebook** | `https://www.facebook.com/watch/?v=10155353594956983` | **BLOCKED** | `ERROR: [facebook] 10155353594956983: Cannot parse data / This video is only available for registered users. Use --cookies-from-browser or --cookies for authentication` | 3.11s |
| **Facebook** | `https://www.facebook.com/NBA/videos/876352824246101/` | **BLOCKED** | `ERROR: [facebook] 876352824246101: Cannot parse data; please report this issue / Login required` | 2.95s |
| **Facebook** | `https://www.facebook.com/watch/?v=539744498565144` | **BLOCKED** | `ERROR: [facebook] 539744498565144: Cannot parse data; please report this issue / Login required` | 2.73s |

---

## 3. Platform Breakdown & Evidence

### A. X / Twitter — RESOLVES
- **Status**: **`RESOLVES`**
- **Evidence**: Testing public sports video tweets from NBA, Premier League, and ESPN returns complete, un-spoofed metadata in ~1.4 seconds.
- **Extracted Fields**:
  - `title`: Real tweet text (e.g., *"The @pacers take a 3-1 series lead! Tyrese Haliburton: 24 PTS..."*)
  - `uploader`: Real verified handle / channel name (`NBA`, `Premier League`, `ESPN`)
  - `duration`: `13.933s`
  - `thumbnail_url`: Real Twitter media image (`https://pbs.twimg.com/media/GMbuEaAWgAA8tXp.jpg`)
- **Note on Burst Rate Limiting**: If many sequential queries are fired in rapid succession from the same IP, Twitter temporarily rate-limits guest tokens and omits video objects (producing `No video could be found in this tweet`) until the guest window resets.

### B. TikTok — BLOCKED
- **Status**: **`BLOCKED`**
- **Evidence**: Unauthenticated HTTP/cURL requests directly to `tiktok.com/@user/video/...` are dropped or timed out after 10,000ms by TikTok's perimeter anti-bot protection.
- **Rule Compliance**: Under Rule 1 & 3, no browser cookies, no CAPTCHA solvers, and no residential proxy rotation are used. Marked **`BLOCKED`** with the exact curl timeout error.

### C. Facebook — BLOCKED
- **Status**: **`BLOCKED`**
- **Evidence**: Both `facebook.com/watch` and `facebook.com/.../videos/` fail with `Cannot parse data` / `This video is only available for registered users. Use --cookies-from-browser or --cookies for authentication`.
- **Rule Compliance**: Because Facebook restricts direct video scraping to authenticated sessions, no login bypass or session credentials were used. Marked **`BLOCKED`** with exact error.

---

## 4. Pipeline Integration: Thumbnail Scan (Sentinel & Adjudicator)

When an unauthenticated link successfully resolves (such as X/Twitter), the resolver:
1. Downloads **only** the thumbnail image.
2. Passes it through the **Sentinel** vision pipeline (`agents.sentinel.scan_thumbnail`).
3. Computes:
   - **CLIP Vision Similarity** (using ONNX CLIP ViT-B/32 against protected FAISS vault)
   - **pHash Distance** (pixel hash match verification)
   - **Fused Confidence Score** & **Severity Rating**
4. Routes to the **Adjudicator** for real-time legal classification (`SEVERE PIRACY`, `FAIR USE / FAN CONTENT`, or `CLEAN`).

### Live Sentinel Scan Result on Resolved X/Twitter Link:
```json
{
  "confidence_score": 52.54,
  "clip_confidence": 55.48,
  "clip_similarity": 0.5408,
  "phash_match": false,
  "severity": "WARNING",
  "match_confirmed": false,
  "top_matches": 1
}
```

---

## 5. Spider Integration (Link Extraction & Resolution)

In `Backend/agents/spider.py`, incoming post bodies and descriptions from **Reddit**, **Telegram**, and **Archive.org** are parsed with regex:
```regex
https?://(?:www\.)?(?:tiktok\.com/[^\s"\'<>]+|(?:twitter\.com|x\.com)/[^\s"\'<>]+|(?:facebook\.com|fb\.watch)/[^\s"\'<>]+)
```
Discovered URLs are:
1. Sent to `resolve(url)` for direct metadata extraction.
2. De-duplicated by canonical URL.
3. Injected into the active threat node list with `resolved` metadata.

---

## 6. Incident Model & Schema Enum Verification

The `Incident` Mongoose model and Joi validation schemas were updated to include `TikTok`, `X`, `Twitter`, `Facebook`, and `Dailymotion`:
```javascript
const PLATFORMS = [
  "YouTube", "TikTok", "X", "Twitter", "Facebook", "Dailymotion",
  "Instagram", "Telegram", "Reddit", "Rumble", "Vimeo", "Twitch",
  "Torrent/TPB", "Torrents", "Archive.org", "Other",
];
```

Unit test output (`node Backend/server/test_incident_enum.js`):
```
==================================================
  Unit Test: Incident Model & Schema Platform Enum
==================================================
✅ Mongoose Incident enum accepts: TikTok
✅ Mongoose Incident enum accepts: X
✅ Mongoose Incident enum accepts: Twitter
✅ Mongoose Incident enum accepts: Facebook
✅ Mongoose Incident enum accepts: Dailymotion
✅ Joi adjudicateRequestSchema accepts: TikTok
✅ Joi adjudicateRequestSchema accepts: X
✅ Joi adjudicateRequestSchema accepts: Twitter
✅ Joi adjudicateRequestSchema accepts: Facebook
✅ Joi adjudicateRequestSchema accepts: Dailymotion
✅ Mongoose Incident enum correctly rejects invalid platform
✅ Joi adjudicateRequestSchema correctly rejects invalid platform
==================================================
Results: 12 passed, 0 failed
==================================================
```

---

## 7. Dashboard Verification Screenshots

### Screenshot 1: Successful Link Resolution & Live Scan (X / Twitter)
![X / Twitter Scan Result](screenshots/x_twitter_scan_result.png)

### Screenshot 2: Platform Status Matrix & Tooltips on Threat Hunter Dashboard
![Threat Hunter Dashboard & Status Matrix](screenshots/threat_hunter_dashboard.png)

### Screenshot 3: Platform Blocking Policy Enforcement (TikTok)
![TikTok Blocked Result](screenshots/tiktok_blocked_result.png)
