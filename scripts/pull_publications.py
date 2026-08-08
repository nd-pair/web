#!/usr/bin/env python3
"""
Build data/publications.json for the Publications page by pulling works from
OpenAlex for each faculty member (data/faculty.json), grouped by year.

Deduped by OpenAlex work id; for each work we record the title, venue, year,
DOI/OpenAlex link, and which ND robotics faculty are authors. Only works from
MIN_YEAR onward are included (keeps the page current and fast).
"""
import json, os, sys, time, urllib.parse, urllib.request

MAILTO = os.environ.get("OPENALEX_MAILTO", "nd-pair@nd.edu")
API = "https://api.openalex.org"
MIN_YEAR = int(os.environ.get("PUBS_MIN_YEAR", "2016"))

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FAC = json.load(open(os.path.join(ROOT, "data", "faculty.json")))
IDS = {f["openalex_id"]: f["name"] for f in FAC if f.get("openalex_id")}


def http_get(url):
    req = urllib.request.Request(url, headers={"User-Agent": f"nd-pair-web ({MAILTO})"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def works_for(aid):
    cursor = "*"
    while cursor:
        q = urllib.parse.urlencode({
            "filter": f"author.id:{aid},from_publication_date:{MIN_YEAR}-01-01",
            "select": "id,title,publication_year,publication_date,primary_location,authorships",
            "per-page": 200, "cursor": cursor, "mailto": MAILTO,
        })
        data = http_get(f"{API}/works?{q}")
        for w in data.get("results", []):
            yield w
        cursor = data.get("meta", {}).get("next_cursor")
        time.sleep(0.2)


def main():
    works = {}
    for aid, name in IDS.items():
        n = 0
        for w in works_for(aid):
            n += 1
            wid = w["id"]
            if wid not in works:
                loc = w.get("primary_location") or {}
                src = (loc.get("source") or {}) if loc else {}
                works[wid] = {
                    "id": wid,
                    "title": (w.get("title") or "(untitled)").strip(),
                    "year": w.get("publication_year"),
                    "date": w.get("publication_date"),
                    "venue": (src.get("display_name") if src else None),
                    "authors": set(),
                }
            # record ND faculty authors on this work
            for a in w.get("authorships", []):
                au = (a.get("author") or {})
                aid2 = (au.get("id") or "").rsplit("/", 1)[-1]
                if aid2 in IDS:
                    works[wid]["authors"].add(IDS[aid2])
        print(f"  {name}: {n} works since {MIN_YEAR}", file=sys.stderr)

    # collapse duplicate records of the same paper (preprint + published share a
    # title but have different OpenAlex ids): keep the richest, merge authors.
    import re
    def norm(t): return re.sub(r"[^a-z0-9]+", " ", (t or "").lower()).strip()
    def score(w): return (1 if w.get("venue") else 0, 1 if w.get("date") else 0)
    by_title = {}
    for w in works.values():
        k = norm(w["title"]) or w["id"]
        cur = by_title.get(k)
        if cur is None:
            by_title[k] = w
        else:
            cur["authors"] |= w["authors"]
            if score(w) > score(cur):
                w["authors"] = cur["authors"]
                by_title[k] = w

    # group by year, newest first; within a year newest date first
    years = {}
    for w in by_title.values():
        w["authors"] = sorted(w["authors"])
        years.setdefault(w["year"], []).append(w)
    year_list = []
    for y in sorted(years, key=lambda y: (y is None, -(y or 0))):
        items = sorted(years[y], key=lambda w: (w["date"] or "", w["title"]), reverse=True)
        year_list.append({"year": y, "count": len(items), "items": items})

    import datetime
    out = {
        "generated": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
        "source": "OpenAlex (https://openalex.org)",
        "minYear": MIN_YEAR,
        "total": len(by_title),
        "years": year_list,
    }
    json.dump(out, open(os.path.join(ROOT, "data", "publications.json"), "w"), indent=2)
    print(f"wrote data/publications.json — {len(by_title)} works "
          f"(deduped from {len(works)}) across {len(year_list)} years")


if __name__ == "__main__":
    main()
