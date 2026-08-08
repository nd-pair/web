# Physical AI and Robotics Initiative — website

A forward-looking, lightly animated site for the Physical AI and Robotics
Initiative at the University of Notre Dame, in the University's navy-and-gold
identity. Static HTML/CSS/JS — no build step.

**Live site:** https://nd-pair.github.io/web/

## Pages

- **Home** (`index.html`) — hero, focus areas, quick stats, featured labs.
- **Laboratories** (`laboratories.html`) — all 13 labs plus the Collaborative
  Testbeds, each linking out to its own site. Data: `data/labs.json`,
  `data/testbeds.json`.
- **People** (`people.html`) — faculty headshots, affiliation, lab + publications
  links. Data: `data/faculty.json` and `assets/faculty/`.
- **Publications** (`publications.html`) — pulled from
  [OpenAlex](https://openalex.org), grouped by year, searchable.
  Data: `data/publications.json`.
- **Internal** (`internal.html`) — links to the password-protected
  [Faculty Collaboration Network](https://nd-pair.github.io/fcn/) (the `nd-pair/fcn`
  repo) and other member resources.

## Publications data

`scripts/pull_publications.py` reads `data/faculty.json` (each faculty member's
OpenAlex author id), pulls their works since `PUBS_MIN_YEAR` (default 2016),
de-duplicates preprint/published pairs by title, and writes
`data/publications.json` grouped by year. It uses only the Python standard
library.

```bash
python scripts/pull_publications.py    # writes data/publications.json
python -m http.server 8000             # then open http://localhost:8000
```

## Automation

`.github/workflows/update.yml` refreshes publications and redeploys to GitHub
Pages **weekly** (Mondays 06:37 UTC), **on push to main**, and **on demand**.
Refreshed data is committed back with `GITHUB_TOKEN` (which does not retrigger the
workflow). One-time: **Settings → Pages → Source: GitHub Actions**.

## Editing content

- **Roster / photos / labs:** `data/faculty.json`, `assets/faculty/`, `data/labs.json`.
  (Headshots and faculty ids were sourced from `robotics.nd.edu` and OpenAlex.)
- **Copy:** written for this site; the department's own text is not reproduced.

## Notes

- All navigation and copy avoid the word "Research" by request; the labs page is
  the entry point to the group's work.
- Sister repo **`nd-pair/fcn`** hosts the internal collaboration network.
