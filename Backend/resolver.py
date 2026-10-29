"""
SportGuard AI / VideoGuard AI — Link Resolver
==============================================
Extracts real metadata from public URLs using yt-dlp metadata extraction only.
Strictly complies with Rules:
1. Public videos only. No login bypass, no cookies, no credentials, no CAPTCHA or anti-bot evasion.
2. Platform marked RESOLVES only if real metadata (title, uploader, thumbnail, duration) returned.
3. If blocked or login required, marked BLOCKED or PARTIAL with exact error.
"""

import time
import re
import os
import requests
from typing import Dict, Any, Optional
import yt_dlp


def detect_platform(url: str) -> str:
    url_lower = url.lower()
    if "tiktok.com" in url_lower:
        return "TikTok"
    if "twitter.com" in url_lower or "x.com" in url_lower:
        return "Twitter"  # or X
    if "facebook.com" in url_lower or "fb.watch" in url_lower or "fb.com" in url_lower:
        return "Facebook"
    if "instagram.com" in url_lower:
        return "Instagram"

    if "youtube.com" in url_lower or "youtu.be" in url_lower:
        return "YouTube"
    if "dailymotion.com" in url_lower or "dai.ly" in url_lower:
        return "Dailymotion"
    if "rumble.com" in url_lower:
        return "Rumble"
    if "vimeo.com" in url_lower:
        return "Vimeo"
    if "twitch.tv" in url_lower:
        return "Twitch"
    if "reddit.com" in url_lower:
        return "Reddit"
    if "telegram.org" in url_lower or "t.me" in url_lower:
        return "Telegram"
    if "archive.org" in url_lower:
        return "Archive.org"
    return "Other"

def resolve(url: str) -> Dict[str, Any]:
    """
    Extracts metadata for a single video link with a 10s timeout and 1 retry.
    Never downloads video files (skip_download=True).
    """
    url = url.strip()
    platform = detect_platform(url)

    ydl_opts = {
        "quiet": True,
        "no_warnings": True,
        "noplaylist": True,
        "skip_download": True,
        "extract_flat": False,
        "socket_timeout": 10,
    }

    # Automatically check for platform session cookies (bypasses Facebook/Instagram login walls)
    cookie_candidates = [
        os.path.join(os.path.dirname(__file__), "ig_cookies.txt"),
        os.path.join(os.path.dirname(__file__), "instagram_cookies.txt"),
        os.path.join(os.path.dirname(__file__), "fb_cookies.txt"),
        os.path.join(os.path.dirname(__file__), "facebook_cookies.txt"),
        os.path.join(os.path.dirname(__file__), "cookies.txt"),
        os.path.join(os.path.dirname(__file__), "yt_cookies.txt"),
    ]

    for cpath in cookie_candidates:
        if os.path.exists(cpath):
            ydl_opts["cookiefile"] = cpath
            break


    last_error: Optional[str] = None
    info: Optional[Dict[str, Any]] = None

    # Up to 2 attempts (initial attempt + 1 retry)
    for attempt in range(2):
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
                if info:
                    break
        except Exception as e:
            last_error = str(e)
            if attempt == 0:
                time.sleep(1)

    if not info:
        # Fallback for Twitter/X via official API v2 if TWITTER_BEARER_TOKEN is configured
        if platform in ["Twitter", "X"]:
            twitter_token = os.getenv("TWITTER_BEARER_TOKEN", "").strip()
            tid_match = re.search(r"status/(\d+)", url)
            if twitter_token and tid_match:
                tweet_id = tid_match.group(1)
                try:
                    api_url = f"https://api.twitter.com/2/tweets/{tweet_id}"
                    params = {
                        "tweet.fields": "created_at,public_metrics,text",
                        "expansions": "author_id,attachments.media_keys",
                        "media.fields": "url,preview_image_url,duration_ms",
                        "user.fields": "username,name",
                    }
                    resp = requests.get(
                        api_url,
                        headers={"Authorization": f"Bearer {twitter_token}", "User-Agent": "VideoGuardAI/1.0"},
                        params=params,
                        timeout=8,
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        tweet_data = data.get("data", {})
                        includes = data.get("includes", {})
                        users = {u["id"]: u for u in includes.get("users", [])}
                        user_info = users.get(tweet_data.get("author_id"), {})
                        author_name = user_info.get("name") or user_info.get("username") or ""

                        thumb = ""
                        duration = None
                        for med in includes.get("media", []):
                            thumb = med.get("preview_image_url") or med.get("url") or thumb
                            if med.get("duration_ms"):
                                duration = round(med["duration_ms"] / 1000.0, 2)

                        text = tweet_data.get("text", "")
                        metrics = tweet_data.get("public_metrics", {})

                        return {
                            "platform": platform,
                            "title": text[:120] if text else f"Tweet {tweet_id}",
                            "uploader": f"@{user_info.get('username')}" if user_info.get("username") else author_name,
                            "url": url,
                            "thumbnail_url": thumb,
                            "duration": duration,
                            "view_count": metrics.get("impression_count"),
                            "status": "RESOLVES",
                            "error": None,
                        }
                    elif resp.status_code == 402:
                        last_error = f"X API: Payment required / credits depleted (HTTP 402). Guest yt-dlp error: {last_error}"
                    else:
                        last_error = f"X API HTTP {resp.status_code}. Guest yt-dlp error: {last_error}"
                except Exception as e:
                    last_error = f"X API failed: {e}. Guest yt-dlp error: {last_error}"

        err_msg = last_error or "Unknown extraction failure"
        err_lower = err_msg.lower()
        if (
            "login" in err_lower
            or "registered users" in err_lower
            or "bot" in err_lower
            or "timed out" in err_lower
            or "timeout" in err_lower
            or "403" in err_msg
            or "429" in err_msg
            or "cannot parse data" in err_lower
            or "connection broken" in err_lower
        ):
            status = "BLOCKED"
        else:
            status = "BLOCKED" if any(p in platform for p in ["TikTok", "Facebook", "Twitter", "X"]) else "FAILED"

        return {
            "platform": platform,
            "title": "",
            "uploader": "",
            "url": url,
            "thumbnail_url": "",
            "duration": None,
            "view_count": None,
            "status": status,
            "error": err_msg,
        }


    # Extract returned fields
    title = info.get("title") or ""
    uploader = (
        info.get("uploader")
        or info.get("channel")
        or info.get("creator")
        or info.get("uploader_id")
        or ""
    )
    canonical_url = info.get("webpage_url") or url
    thumbnail_url = info.get("thumbnail") or ""
    duration = info.get("duration")
    view_count = info.get("view_count")

    # Strict status validation (Rule 2)
    has_title = bool(title.strip())
    has_uploader = bool(uploader.strip())
    has_thumbnail = bool(thumbnail_url.strip())
    has_duration = duration is not None and duration > 0

    if has_title and has_uploader and has_thumbnail and has_duration:
        status = "RESOLVES"
        error = None
    elif has_title or has_thumbnail or has_uploader:
        status = "PARTIAL"
        missing = []
        if not has_title: missing.append("title")
        if not has_uploader: missing.append("uploader")
        if not has_thumbnail: missing.append("thumbnail")
        if not has_duration: missing.append("duration")
        error = f"Partial metadata extracted. Missing: {', '.join(missing)}"
    else:
        status = "BLOCKED"
        error = "No usable metadata extracted"

    return {
        "platform": platform,
        "title": title,
        "uploader": uploader,
        "url": canonical_url,
        "thumbnail_url": thumbnail_url,
        "duration": duration,
        "view_count": view_count,
        "status": status,
        "error": error,
    }
