import time
import json
import os
import sys

# Ensure UTF-8 output
sys.stdout.reconfigure(encoding="utf-8")

from resolver import resolve

test_cases = {
    "X/Twitter": [
        "https://x.com/NBA/status/1785124233159344400",
        "https://x.com/premierleague/status/1784931362699563228",
        "https://x.com/espn/status/1785509930777121271",
    ],
    "TikTok": [
        "https://www.tiktok.com/@nba/video/7363486161108258090",
        "https://www.tiktok.com/@nba/video/7361250269094251822",
        "https://www.tiktok.com/@nba/video/7365342410389146922",
    ],
    "Facebook": [
        "https://www.facebook.com/watch/?v=10155353594956983",
        "https://www.facebook.com/NBA/videos/876352824246101/",
        "https://www.facebook.com/watch/?v=539744498565144",
    ],
}

all_results = []
for plat, urls in test_cases.items():
    print(f"\n=================== {plat} ===================")
    for u in urls:
        t0 = time.time()
        res = resolve(u)
        elapsed = round(time.time() - t0, 2)
        res["elapsed_sec"] = elapsed
        all_results.append(res)
        print(f"URL: {u}")
        print(f"  Platform: {res.get('platform')}")
        print(f"  Status: {res['status']} ({elapsed}s)")
        print(f"  Title: {res.get('title')}")
        print(f"  Uploader: {res.get('uploader')}")
        print(f"  Duration: {res.get('duration')}")
        thumb = res.get('thumbnail_url')
        print(f"  Thumbnail: {thumb[:60] if thumb else 'None'}")
        print(f"  Error: {res.get('error')}")
        print("-" * 50)

out_file = os.path.join(os.path.dirname(__file__), "resolver_test_results.json")
with open(out_file, "w", encoding="utf-8") as f:
    json.dump(all_results, f, indent=2)
print(f"\nAll results saved to {out_file}")
