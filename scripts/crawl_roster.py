#!/usr/bin/env python3
"""
Refresh the PAIR roster from https://robotics.nd.edu/people/ (runs in CI, e.g.
every two weeks). Writes:

  data/faculty.json   Core + Affiliated faculty. Name/photo/affiliated status are
                      taken from the people page; lab/lab_url and openalex_id are
                      PRESERVED from the existing file (OpenAlex ids are resolved
                      only for faculty we don't already know). Headshots are
                      downloaded to assets/faculty/.
  data/students.json  Current graduate students (names), from the "Current
                      Students" section (Alumni are excluded).

Standard library + BeautifulSoup only, so it runs unattended in GitHub Actions.
If the page can't be parsed the existing files are left untouched.
"""
import json, os, re, sys, time, urllib.parse, urllib.request
from bs4 import BeautifulSoup

MAILTO = os.environ.get("OPENALEX_MAILTO", "nd-pair@nd.edu")
ND = "https://openalex.org/I107639228"
API = "https://api.openalex.org"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PHOTO_DIR = os.path.join(ROOT, "assets", "faculty")
os.makedirs(PHOTO_DIR, exist_ok=True)
PEOPLE_URL = "https://robotics.nd.edu/people/"
ORIGIN = "https://robotics.nd.edu"
SEARCH_NAME = {"j-william-goodwine": "Bill Goodwine"}
OVERRIDES = {"zhi-zheng": "A5065741205"}
# Faculty whose OpenAlex identity is SPLIT across several author entities and whose
# name is distinctive enough to safely aggregate every exact-name match. Never add
# common names here (e.g. "Hai Lin") — that would pull in unrelated namesakes.
SPLIT_AGGREGATE = {"nikolaus-correll"}
UA = f"nd-pair-roster ({MAILTO})"


def http(url, as_json=False, binary=False):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        data = r.read()
    if binary:
        return data
    text = data.decode("utf-8", "replace")
    return json.loads(text) if as_json else text


def norm_tokens(s):
    return [t for t in re.sub(r"[^a-z ]", " ", (s or "").lower()).split() if len(t) > 1]


def surname(name):
    t = norm_tokens(name)
    return t[-1] if t else ""


def resolve_openalex(name, slug):
    if slug in OVERRIDES:
        try:
            return http(f"{API}/authors/{OVERRIDES[slug]}?mailto={MAILTO}", as_json=True)["id"].rsplit("/", 1)[-1]
        except Exception:
            return None
    sur, q, ndid = surname(name), urllib.parse.quote(name), ND.split("/")[-1]
    for url in (f"{API}/authors?filter=affiliations.institution.id:{ndid}&search={q}&per-page=25&mailto={MAILTO}",
                f"{API}/authors?search={q}&per-page=25&mailto={MAILTO}"):
        try:
            res = http(url, as_json=True).get("results", [])
        except Exception:
            continue
        matched = [a for a in res if sur and sur in norm_tokens(a.get("display_name", ""))] or res
        nd = [a for a in matched if any(i.get("id") == ND for i in (a.get("last_known_institutions") or []))]
        cand = nd or matched
        if cand:
            return max(cand, key=lambda a: a.get("works_count", 0))["id"].rsplit("/", 1)[-1]
    return None


def all_ids_for(name, primary):
    """All OpenAlex author ids whose display name exactly matches `name`
    (used only for SPLIT_AGGREGATE faculty). Handles OpenAlex author-splitting."""
    ids = {primary} if primary else set()
    try:
        res = http(f"{API}/authors?search={urllib.parse.quote(name)}&per-page=50&mailto={MAILTO}",
                   as_json=True).get("results", [])
    except Exception:
        return sorted(ids)
    tgt = norm_tokens(name)
    for a in res:
        if norm_tokens(a.get("display_name", "")) == tgt:
            ids.add(a["id"].rsplit("/", 1)[-1])
    return sorted(ids)


def download_photo(url, slug):
    if not url:
        return None
    if url.startswith("//"):
        url = "https:" + url
    elif url.startswith("/"):
        url = ORIGIN + url
    ext = os.path.splitext(url.split("?")[0])[1].lower()
    if ext not in (".jpg", ".jpeg", ".png", ".webp"):
        ext = ".jpg"
    rel = f"assets/faculty/{slug}{ext}"
    try:
        with open(os.path.join(ROOT, rel), "wb") as f:
            f.write(http(url, binary=True))
        return f"{slug}{ext}"
    except Exception as e:
        print(f"   !! photo failed {slug}: {e}", file=sys.stderr)
        return None


def parse_people(html):
    """Return (faculty, students).
    faculty: [{slug, name, photo_url, affiliated}]  students: [names]."""
    soup = BeautifulSoup(html, "html.parser")
    heads = soup.find_all(["h1", "h2", "h3", "h4"])
    def line(txt):
        h = next((h for h in heads if re.sub(r"\s+", " ", h.get_text(strip=True)) == txt), None)
        return h.sourceline if h else None
    aff_line = line("Affiliated Faculty")
    cur_line = line("Current Students")
    alum_line = line("Alumni")

    faculty, seen = [], set()
    for img in soup.select("img.image-circle"):
        node = img
        for _ in range(6):
            node = node.parent
            if node is None:
                break
            a = node.find("a", href=lambda h: h and re.search(r"nd\.edu/faculty/[a-z0-9-]+", h or ""))
            if not a:
                continue
            slug = re.search(r"nd\.edu/faculty/([a-z0-9-]+)", a["href"]).group(1)
            if slug in seen:
                break
            seen.add(slug)
            affiliated = bool(aff_line and (img.sourceline or 0) >= aff_line)
            faculty.append({"slug": slug, "name": a.get_text(strip=True),
                            "photo_url": img.get("src") or "", "affiliated": affiliated})
            break

    # Current students live between "Current Students" and "Alumni" as list items
    # formatted "Name, DEPT (Advisor), joined SEASON YEAR". Alumni are handled in
    # data/alumni.json (hand-maintained); they rarely change.
    students = []
    i = html.find("Current Students"); j = html.find("Alumni", i)
    if i != -1 and j != -1:
        fs = BeautifulSoup(html[i:j], "html.parser")
        for li in fs.find_all("li"):
            full = re.sub(r"\s+", " ", li.get_text()).strip()
            m = re.match(r"^(.*?),\s*([A-Za-z]{2,4})\s*\(([^)]+)\)\s*,\s*joined\s+(.+)$", full)
            if not m:
                continue
            a = li.find("a", href=True)
            students.append({"name": m.group(1).strip(),
                             "url": a["href"] if a else None,
                             "dept": m.group(2), "advisor": m.group(3),
                             "joined": m.group(4).strip()})
    return faculty, students


def slugify_name(name):
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def main():
    try:
        html = http(PEOPLE_URL)
        faculty, students = parse_people(html)
    except Exception as e:
        print(f"[roster] could not parse people page ({e}); leaving files untouched", file=sys.stderr)
        return
    if len(faculty) < 5 or len(students) < 3:
        print(f"[roster] suspicious counts (fac={len(faculty)}, stu={len(students)}); "
              "leaving files untouched", file=sys.stderr)
        return

    prev = {f["slug"]: f for f in json.load(open(os.path.join(ROOT, "data", "faculty.json")))}
    out = []
    for f in faculty:
        slug = f["slug"]; p = prev.get(slug, {})
        oaid = p.get("openalex_id") or resolve_openalex(SEARCH_NAME.get(slug, re.sub(r"-", " ", slug).title()), slug)
        # Aggregate split OpenAlex identities for distinctive-name faculty (safety
        # net; harmless once the author entities are merged upstream).
        ids = all_ids_for(f["name"], oaid) if slug in SPLIT_AGGREGATE else ([oaid] if oaid else [])
        photo = download_photo(f["photo_url"], slug) or p.get("photo")
        out.append({
            "slug": slug, "name": f["name"], "openalex_id": oaid, "openalex_ids": ids,
            "photo": photo, "affiliated": f["affiliated"],
            "lab": p.get("lab"), "lab_url": p.get("lab_url"),
        })
        print(f"[faculty] {f['name']}  aff={f['affiliated']}  oa={oaid}"
              + (f"  (+{len(ids)-1} split ids)" if len(ids) > 1 else ""))
        time.sleep(0.2)

    json.dump(out, open(os.path.join(ROOT, "data", "faculty.json"), "w"), indent=2)
    json.dump(students, open(os.path.join(ROOT, "data", "students.json"), "w"), indent=2)
    # prune photos no longer referenced
    keep = {f["photo"] for f in out if f.get("photo")}
    for fn in os.listdir(PHOTO_DIR):
        if fn not in keep:
            os.remove(os.path.join(PHOTO_DIR, fn)); print(f"[prune] photo {fn}")
    print(f"[roster] {len(out)} faculty, {len(students)} students")


if __name__ == "__main__":
    main()
