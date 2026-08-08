#!/usr/bin/env python3
"""
Refresh lab imagery for the 'Scenes from the lab' gallery by rendering each lab
site with a headless browser (they are JavaScript-rendered, so plain HTTP finds
nothing) and grabbing the largest photo. Downloads to assets/img/ and rewrites
data/gallery.json.

Best-effort: if fewer than a couple of images are found (e.g. a site is down),
the existing gallery is left untouched. Requires Playwright + Chromium; the CI
workflow installs them and runs this step with continue-on-error.
"""
import json, os, re, sys, urllib.request
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMGDIR = os.path.join(ROOT, "assets", "img")
os.makedirs(IMGDIR, exist_ok=True)
LABS = json.load(open(os.path.join(ROOT, "data", "labs.json")))
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/122 Safari/537.36"
MIN_BYTES = 30_000

JS = """() => {
  const seen=new Set(), out=[];
  const ok=u=>u&&!seen.has(u)&&!/logo|icon|favicon|sprite|avatar|badge|\\.svg/i.test(u);
  const push=u=>{ if(ok(u)){ seen.add(u); out.push(u); } };
  document.querySelectorAll('img').forEach(im=>{ if(im.naturalWidth>=650&&im.naturalHeight>=420) push(im.currentSrc||im.src); });
  document.querySelectorAll('*').forEach(el=>{ const bg=getComputedStyle(el).backgroundImage; const m=bg&&bg.match(/url\\(["']?([^"')]+)/); if(m){ const r=el.getBoundingClientRect(); if(r.width>=650&&r.height>=320) push(new URL(m[1],location.href).href); } });
  return out.slice(0,6);
}"""


def slugify(name):
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def download(url, dest):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=45) as r:
        data = r.read()
    if len(data) < MIN_BYTES:
        return 0
    ext = ".jpg"
    if data[:8].startswith(b"\x89PNG"): ext = ".png"
    elif data[:4] == b"RIFF" and data[8:12] == b"WEBP": ext = ".webp"
    with open(dest + ext, "wb") as f:
        f.write(data)
    return len(data), ext


def main():
    manifest = []
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context(user_agent=UA, viewport={"width": 1440, "height": 900})
        for lab in LABS:
            try:
                page = ctx.new_page()
                page.goto(lab["url"], wait_until="networkidle", timeout=30000)
                page.wait_for_timeout(1200)
                urls = page.evaluate(JS)
                page.close()
            except Exception as e:
                print(f"[skip] {lab['name']}: {e}", file=sys.stderr); continue
            for u in urls:
                try:
                    res = download(u, os.path.join(IMGDIR, slugify(lab["name"])))
                    if res:
                        n, ext = res
                        manifest.append({"src": f"assets/img/{slugify(lab['name'])}{ext}",
                                         "lab": lab["name"], "url": lab["url"], "bytes": n})
                        print(f"[ok] {lab['name']} ({n // 1024} KB)")
                        break
                except Exception:
                    continue
        browser.close()

    if len(manifest) < 3:
        print(f"[images] only {len(manifest)} found; keeping existing gallery.json", file=sys.stderr)
        return
    manifest.sort(key=lambda m: -m["bytes"])
    for m in manifest:
        m.pop("bytes", None)
    json.dump(manifest, open(os.path.join(ROOT, "data", "gallery.json"), "w"), indent=2)
    print(f"[images] wrote gallery.json — {len(manifest)} images")


if __name__ == "__main__":
    main()
