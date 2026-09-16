# Physical AI and Robotics Initiative

Website for the **Physical AI and Robotics Initiative** at the **University of Notre Dame** — a
collaborative community of faculty, students and laboratories building robots to increase human
flourishing.

Live at **[nd-pair.github.io/web](https://nd-pair.github.io/web/)**.

## Built on the Notre Dame Web Theme

The site uses **NDT4**, the University's official web theme, as required for any site on an
`nd.edu` subdomain ([web brand standards](https://onmessage.nd.edu/university-branding/website-requirements/)).
Every page loads the theme's shared assets and uses its components — site header, primary
navigation, page header, cards, stats, buttons, accordion, site footer, global menu:

```html
<link rel="stylesheet" href="https://conductor.nd.edu/stylesheets/themes/ndt/4.0/ndt.css">
...
<script>window.NDTConductorHost='https://conductor.nd.edu';</script>
<script src="https://conductor.nd.edu/javascripts/themes/ndt/4.0/ndt.js"></script>
```

Component documentation lives at [webtheme.nd.edu](https://webtheme.nd.edu) and is also available
to AI coding assistants over MCP at `https://webtheme.nd.edu/mcp` — use it to check the real
markup for a component before hand-writing it.

`styles.css` holds only the handful of site-specific patterns the theme has no component for (the
student and alumni rosters, the publication list, the members' gate); it builds them from theme
custom properties so light/dark mode and the brand palette stay intact. **Do not** re-style theme
components: colours, type, spacing, buttons and cards must stay exactly as the design kit defines
them.

## How the site is built

Pages are assembled at build time and committed to the repository root. Nothing is fetched from
JSON in the browser — the content ships in the HTML, so pages are fast, work without JavaScript,
and read correctly to screen readers and crawlers.

```
partials/      shared chrome: head, skip links, header, footer, global menu, icon sprite
pages/         one file per page: JSON front matter + the page's <main> content
scripts/
  build_site.py   stitches partials + pages -> *.html at the repo root, writes sitemap.xml
  render.py       renders labs, testbeds, stats, people, publications and the gallery
```

After editing anything in `partials/` or `pages/`, or any file in `data/`, run:

```bash
python3 scripts/build_site.py
```

CI runs the same command before publishing, so the deployed pages always match the sources.
`app.js` adds three progressive enhancements: the members' gate, scoping the global-menu search to
this site, and filtering the publication list as you type.

| Page | Source | Data |
| --- | --- | --- |
| Home | `pages/index.html` | `labs.json`, `testbeds.json`, `faculty.json`, `publications.json`, `gallery.json` |
| Laboratories | `pages/laboratories.html` | `labs.json`, `testbeds.json` |
| People | `pages/people.html` | `faculty.json`, `students.json`, `alumni.json` |
| Publications | `pages/publications.html` | `publications.json`, `faculty.json`, `students.json` |
| Internal | `pages/internal.html` | — |
| 404 | `pages/404.html` | — |

## The members' gate

`app.js` puts a password panel in front of the site until the access phrase is entered, and
remembers it for the browser session. This is a **soft gate over public data**, not a security
boundary: the hash is in the source and the content is in the HTML, so anyone determined — or any
crawler — can read it. It keeps the preview out of casual view and nothing more.

## Data pipeline

```bash
python3 scripts/crawl_roster.py        # faculty, students and headshots from robotics.nd.edu
python3 scripts/pull_publications.py   # publications from OpenAlex, grouped by year
python3 scripts/crawl_lab_images.py    # lab imagery for the gallery (needs playwright)
```

Headshots are stored as square 400px WebP, which is the shape the theme's people card wants and a
fraction of the bytes of the originals.

## Automation

- **`.github/workflows/update.yml`** — on every push to `main`, and on the 1st and 15th: refreshes
  the roster and publications, rebuilds the pages, commits, and deploys to GitHub Pages.
- **`.github/workflows/labs.yml`** — weekly (Mondays): refreshes lab imagery, rebuilds and deploys.

Both rebase onto the branch before pushing, because the crawls take minutes and `main` can move
while they run. Only the publishable files are deployed; `pages/`, `partials/`, `scripts/` and
`data/` are not.

## Quality bar

The University enforces these thresholds for `nd.edu` sites, measured with Lighthouse:
performance ≥ 80 mobile and ≥ 90 desktop, accessibility 100, SEO 100, best practices ≥ 80, and
WCAG 2.2 AA conformance. Re-check after any change — most regressions come from unsized images,
non-theme colours, or skipped heading levels.
