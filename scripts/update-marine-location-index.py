from __future__ import annotations

import json
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path
from urllib.parse import urlparse

SITEMAP_URL = "https://tides4fishing.com/sitemap.xml"
OUTPUT_PATH = Path(__file__).resolve().parents[1] / "api" / "data" / "tides4fishing_au_paths.json"

request = urllib.request.Request(
    SITEMAP_URL,
    headers={"User-Agent": "SeaMap/1.0 (+marine location index updater)"},
)
with urllib.request.urlopen(request, timeout=30) as response:
    root = ET.fromstring(response.read())

namespace = {"sitemap": "http://www.sitemaps.org/schemas/sitemap/0.9"}
paths: list[str] = []
for node in root.findall("sitemap:url", namespace):
    location = node.findtext("sitemap:loc", default="", namespaces=namespace)
    parsed = urlparse(location)
    parts = parsed.path.strip("/").split("/")
    if parsed.scheme == "https" and parsed.hostname == "tides4fishing.com" and len(parts) == 3 and parts[0] == "au":
        paths.append(parsed.path)

OUTPUT_PATH.write_text(
    json.dumps(list(dict.fromkeys(paths)), ensure_ascii=True, indent=2) + "\n",
    encoding="utf-8",
)
print(f"Wrote {len(paths)} Australian location paths to {OUTPUT_PATH}")
