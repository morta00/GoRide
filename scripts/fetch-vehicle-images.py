#!/usr/bin/env python3
"""
Scrape real car photos from Wikipedia and save locally for GoRide demo vehicles.
Output:
  - angularpfe/src/assets/images/cars/{PLATE}.jpg  (Angular)
  - GoRide/src/main/resources/static/vehicle-photos/{PLATE}.jpg  (Spring Boot)
  - GoRide/src/main/resources/vehicle-photos.json  (URLs used by DataSeeder)
"""
import json
import re
import ssl
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "angularpfe" / "src" / "assets" / "images" / "cars"
STATIC_DIR = ROOT / "GoRide" / "src" / "main" / "resources" / "static" / "vehicle-photos"
JSON_OUT = ROOT / "GoRide" / "src" / "main" / "resources" / "vehicle-photos.json"
MANIFEST = ROOT / "GoRide" / "src" / "main" / "resources" / "vehicle-photos-manifest.md"

USER_AGENT = "GoRide-PFE/1.0 (educational; contact: demo@goride.local)"

VEHICLES = [
    ("DEMO-TU-001", "Peugeot", "208", "Peugeot 208"),
    ("DEMO-TU-002", "Renault", "Clio V", "Renault Clio"),
    ("DEMO-AR-001", "Hyundai", "i20", "Hyundai i20"),
    ("DEMO-SO-001", "Volkswagen", "Polo", "Volkswagen Polo"),
    ("DEMO-SO-002", "Toyota", "Yaris", "Toyota Yaris"),
    ("DEMO-SF-001", "Renault", "Symbol", "Renault Symbol"),
    ("DEMO-SF-002", "Dacia", "Logan", "Dacia Logan"),
    ("DEMO-HA-001", "Fiat", "500", "Fiat 500 (2007)"),
    ("DEMO-BI-001", "Peugeot", "3008", "Peugeot 3008"),
    ("DEMO-NA-001", "Kia", "Sportage", "Kia Sportage"),
    ("DEMO-MO-001", "Mercedes", "Classe C", "Mercedes-Benz C-Class"),
    ("DEMO-TU-003", "Ford", "Transit", "Ford Transit"),
    ("DEMO-SO-003", "BMW", "Série 3", "BMW 3 Series (G20)"),
    ("DEMO-TU-004", "Toyota", "RAV4", "Toyota RAV4"),
]

# Direct Wikimedia Commons URLs (full-size, unique per model) — used if Wikipedia API fails
COMMONS_DIRECT = {
    "DEMO-TU-001": "https://upload.wikimedia.org/wikipedia/commons/3/3a/Peugeot_208_GT_Line_2020.jpg",
    "DEMO-TU-002": "https://upload.wikimedia.org/wikipedia/commons/8/8d/2019_Renault_Clio_V_1.0_TCe_100_Icon_Front.jpg",
    "DEMO-AR-001": "https://upload.wikimedia.org/wikipedia/commons/4/4e/Hyundai_i20_2020_%28cropped%29.jpg",
    "DEMO-SO-001": "https://upload.wikimedia.org/wikipedia/commons/9/9d/2018_Volkswagen_Polo_SE_TSI_1.0_Front.jpg",
    "DEMO-SO-002": "https://upload.wikimedia.org/wikipedia/commons/5/5f/2020_Toyota_Yaris_Design_HEV_%28cropped%29.jpg",
    "DEMO-SF-001": "https://upload.wikimedia.org/wikipedia/commons/2/2e/Renault_Symbol_III_%28cropped%29.jpg",
    "DEMO-SF-002": "https://upload.wikimedia.org/wikipedia/commons/8/8a/Dacia_Logan_III_2022_%28cropped%29.jpg",
    "DEMO-HA-001": "https://upload.wikimedia.org/wikipedia/commons/9/9c/Fiat_500_%282007%29_front.JPG",
    "DEMO-BI-001": "https://upload.wikimedia.org/wikipedia/commons/0/0e/Peugeot_3008_GT_Line_2020_%28cropped%29.jpg",
    "DEMO-NA-001": "https://upload.wikimedia.org/wikipedia/commons/3/3f/2022_Kia_Sportage_GT-Line_%28cropped%29.jpg",
    "DEMO-MO-001": "https://upload.wikimedia.org/wikipedia/commons/9/9f/Mercedes-Benz_W206_1X7A1830.jpg",
    "DEMO-TU-003": "https://upload.wikimedia.org/wikipedia/commons/d/d0/2016_Ford_Transit_Custom_290_Trend_%28cropped%29.jpg",
    "DEMO-SO-003": "https://upload.wikimedia.org/wikipedia/commons/3/31/2019_BMW_320d_M_Sport_Automatic_2.0_Front.jpg",
    "DEMO-TU-004": "https://upload.wikimedia.org/wikipedia/commons/b/b4/2019_Toyota_RAV4_Hybrid_XLE_AWD_%28cropped%29.jpg",
}


def fetch_json(url: str) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    ctx = ssl.create_default_context()
    with urllib.request.urlopen(req, timeout=25, context=ctx) as resp:
        return json.loads(resp.read().decode("utf-8"))


def wiki_thumbnail_url(title: str) -> str | None:
    slug = title.replace(" ", "_")
    url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{urllib.parse.quote(slug)}"
    data = fetch_json(url)
    thumb = data.get("thumbnail") or {}
    return thumb.get("source")


def download_bytes(url: str) -> bytes | None:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    ctx = ssl.create_default_context()
    try:
        with urllib.request.urlopen(req, timeout=45, context=ctx) as resp:
            data = resp.read()
        if len(data) < 3000:
            return None
        return data
    except Exception as e:
        print(f"    download error: {e}")
        return None


def save_jpeg(data: bytes, path: Path) -> bool:
    if data[:3] == b"\xff\xd8\xff" or data[:4] == b"\x89PNG":
        path.write_bytes(data)
        return True
    return False


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    STATIC_DIR.mkdir(parents=True, exist_ok=True)

    result = {}
    lines = ["# GoRide demo vehicle photos (scraped)\n", "| Plate | Brand | Model | File | Source |\n", "|-------|-------|-------|------|--------|\n"]

    for i, (plate, brand, model, wiki_title) in enumerate(VEHICLES):
        print(f"\n[{i+1}/{len(VEHICLES)}] {plate} — {brand} {model}")
        source_url = None
        source_label = ""

        try:
            source_url = wiki_thumbnail_url(wiki_title)
            if source_url:
                source_label = f"Wikipedia: {wiki_title}"
                print(f"  Wikipedia thumb OK")
        except Exception as e:
            print(f"  Wikipedia: {e}")

        if not source_url:
            source_url = COMMONS_DIRECT.get(plate)
            source_label = "Wikimedia Commons (direct)"
            print(f"  Using Commons direct URL")

        time.sleep(1.5)

        filename = f"{plate}.jpg"
        angular_path = OUT_DIR / filename
        spring_path = STATIC_DIR / filename

        data = download_bytes(source_url) if source_url else None
        if data and save_jpeg(data, angular_path):
            spring_path.write_bytes(data)
            result[plate] = f"/vehicle-photos/{filename}"
            print(f"  Saved local: {angular_path.name} ({len(data)//1024} KB)")
            lines.append(f"| {plate} | {brand} | {model} | `{filename}` | {source_label} |\n")
        elif source_url:
            result[plate] = source_url
            print(f"  Remote URL only (could not download)")
            lines.append(f"| {plate} | {brand} | {model} | remote | {source_url[:50]}... |\n")
        else:
            print(f"  FAILED — no image")

    JSON_OUT.write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")
    MANIFEST.write_text("".join(lines), encoding="utf-8")

    local_count = sum(1 for v in result.values() if v.startswith("/vehicle-photos/"))
    print(f"\nDone: {local_count} local files, {len(result)} URLs in {JSON_OUT}")
    print(f"Angular folder: {OUT_DIR}")
    print(f"Backend static: {STATIC_DIR}")


if __name__ == "__main__":
    main()
