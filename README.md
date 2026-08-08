# Physical AI and Robotics Initiative — website

A forward-looking, lightly animated site for the Physical AI and Robotics
Initiative (PAIR) at the University of Notre Dame, in the University's
navy-and-gold identity. Static HTML/CSS/JS — no build step.

**Live site:** https://nd-pair.github.io/web/ — soft password gate: **`pair@nd`**.

> The gate is a *soft* gate implemented in `site.js` (SHA-256 compare, remembered
> per session under the `nd_pair_site` key, independent of the fcn network). Since
> the repo is public the underlying `data/*.json` is still reachable by URL, so it
> marks the site as an internal preview rather than providing real access control.

## Pages

- **Home** (`index.html`) — hero (a recolored South Bend illustration, blue
  duotone), the six **Collaborative Testbeds**, quick stats, featured labs, and a
  moving "Scenes from the lab" image strip.
- **Laboratories** (`laboratories.html`) — the Collaborative Testbeds and all 13
  labs, each linking out to its own site. Data: `data/testbeds.json`, `data/labs.json`.
- **People** (`people.html`) — **Members** and **Affiliated Members** (headshots,
  lab + publications links) plus expandable **Students** groups: current students
  and Ph.D. / M.S. **Alumni** (department, advisor, year, position). Data:
  `data/faculty.json`, `data/students.json`, `data/alumni.json`, `assets/faculty/`.
- **Publications** (`publications.html`) — pulled from [OpenAlex](https://openalex.org),
  grouped by year, searchable; full author lists with PAIR members (faculty +
  current students) highlighted in gold. Data: `data/publications.json`.
- **Internal** (`internal.html`) — links to the password-protected
  [Faculty Collaboration Network](https://nd-pair.github.io/fcn/) (`nd-pair/fcn`).

## Data (edit these — loaded at runtime)

| File | What | Maintained by |
|------|------|----------------|
| `data/faculty.json` | Members + affiliated faculty (name, OpenAlex ids, photo, lab, `affiliated`) | crawler + manual lab map |
| `data/students.json` | Current graduate students (name, dept, advisor, joined) | crawler |
| `data/alumni.json` | Ph.D. + M.S. alumni (name, year, dept, advisor, position) | hand-edited |
| `data/labs.json` | Lab name, URL, blurb, area | hand-edited |
| `data/testbeds.json` | The six Collaborative Testbeds | hand-edited |
| `data/gallery.json` | "Scenes from the lab" images | crawler |
| `data/publications.json` | Publications by year | crawler |

## Scripts

- `scripts/crawl_roster.py` — scrapes `robotics.nd.edu/people/` for faculty
  (with photos → `assets/faculty/`) and current students, resolving OpenAlex ids
  (aggregating split identities for distinctive names, e.g. Correll). Preserves
  hand-set lab mappings; leaves files untouched if the page can't be parsed.
- `scripts/pull_publications.py` — pulls each faculty member's OpenAlex works
  since `PUBS_MIN_YEAR` (default 2016), de-duplicates preprint/published pairs,
  writes `data/publications.json`. Standard library only.
- `scripts/crawl_lab_images.py` — renders each lab site (headless Chromium via
  Playwright) and grabs a photo for the gallery; best-effort.

```bash
pip install -r scripts/requirements.txt
python scripts/crawl_roster.py         # refresh faculty + students + photos
python scripts/pull_publications.py    # refresh publications
python -m http.server 8000             # then open http://localhost:8000
```

## Automation

- `.github/workflows/update.yml` — **every two weeks** (1st & 15th), on push, and
  on demand: refresh roster + publications, commit data, deploy to Pages.
- `.github/workflows/labs.yml` — **weekly** (Mondays): refresh lab imagery, deploy.

Refreshed data is committed back with `GITHUB_TOKEN` (which does not retrigger the
workflow). One-time: **Settings → Pages → Source: GitHub Actions**.

## Notes

- Navigation and copy avoid the word "Research" by request; alumni are not
  gold-highlighted on Publications (only current members are).
- Copy is written for this site; robotics.nd.edu's own text is not reproduced.
- Sister repo **`nd-pair/fcn`** hosts the internal collaboration network (with a
  year-range timeline to sweep collaborations over time).
