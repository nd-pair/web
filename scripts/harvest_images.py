#!/usr/bin/env python3
"""
Skim each laboratory website (data/labs.json) for large images we can use as
backgrounds/illustrations. Grabs og:image and the biggest inline images, filters
to real photos by byte size, downloads to assets/img/, and writes a manifest
data/gallery.json = [{src, lab, url, bytes}].
"""
import json, os, re, sys, urllib.parse, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMGDIR = os.path.join(ROOT, "assets", "img")
os.makedirs(IMGDIR, exist_ok=True)
LABS = json.load(open(os.path.join(ROOT, "data", "labs.json")))

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36"
MIN_BYTES = 30_000            # ~real photo
MAX_PER_LAB = 3
SKIP = re.compile(r"logo|icon|favicon|sprite|avatar|badge|button|banner_?small|placeholder", re.I)


def get(url, binary=False):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=40) as r:
        return r.read() if binary else r.read().decode("utf-8", "replace"), r.headers.get("Content-Type", "")


def candidates(html, base):
    urls = []
    for m in re.finditer(r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)', html, re.I):
        urls.append(m.group(1))
    for m in re.finditer(r'<meta[^>]+name=["\']twitter:image["\'][^>]+content=["\']([^"\']+)', html, re.I):
        urls.append(m.group(1))
    for m in re.finditer(r'<img[^>]+src=["\']([^"\']+\.(?:jpg|jpeg|png|webp)[^"\']*)', html, re.I):
        urls.append(m.group(1))
    for m in re.finditer(r'background-image:\s*url\((["\']?)([^)"\']+)\1\)', html, re.I):
        urls.append(m.group(2))
    out, seen = [], set()
    for u in urls:
        if not u or u.startswith("data:") or SKIP.search(u):
            continue
        full = urllib.parse.urljoin(base, u.split("?")[0] if "googleusercontent" not in u else u)
        if full not in seen:
            seen.add(full); out.append(full)
    return out


def slugify(name):
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def main():
    manifest = []
    for lab in LABS:
        base = lab["url"]; lslug = slugify(lab["name"])
        try:
            html, _ = get(base)
        except Exception as e:
            print(f"[skip] {lab['name']}: {e}", file=sys.stderr); continue
        got = 0
        for u in candidates(html, base):
            if got >= MAX_PER_LAB:
                break
            try:
                data = get(u, binary=True)
                if not isinstance(data, bytes) or len(data) < MIN_BYTES:
                    continue
                # sniff type
                ext = ".jpg"
                if data[:8].startswith(b"\x89PNG"): ext = ".png"
                elif data[:4] == b"RIFF" and data[8:12] == b"WEBP": ext = ".webp"
                elif data[:3] == b"\xff\xd8\xff": ext = ".jpg"
                else:
                    if not re.search(r"\.(jpg|jpeg|png|webp)$", u, re.I):
                        continue
                fn = f"{lslug}-{got+1}{ext}"
                with open(os.path.join(IMGDIR, fn), "wb") as f:
                    f.write(data)
                manifest.append({"src": f"assets/img/{fn}", "lab": lab["name"], "url": base, "bytes": len(data)})
                print(f"[ok] {lab['name']}: {fn} ({len(data)//1024} KB)")
                got += 1
            except Exception:
                continue
        if got == 0:
            print(f"[none] {lab['name']}", file=sys.stderr)
    manifest.sort(key=lambda m: -m["bytes"])
    json.dump(manifest, open(os.path.join(ROOT, "data", "gallery.json"), "w"), indent=2)
    print(f"\nwrote data/gallery.json — {len(manifest)} images from "
          f"{len(set(m['lab'] for m in manifest))} labs")


if __name__ == "__main__":
    main()
