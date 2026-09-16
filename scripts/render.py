#!/usr/bin/env python3
"""Render the data-driven parts of the site into static HTML fragments at build time.

Pre-rendering rather than fetching JSON in the browser keeps the pages fast, makes
the content available without JavaScript, and lets search engines and screen
readers see the real markup. All markup here uses Notre Dame Web Theme (NDT4)
components; see https://webtheme.nd.edu.
"""
import html
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

try:
    from PIL import Image
except Exception:  # Pillow is optional; without it we simply omit width/height
    Image = None

_SIZES = {}


def esc(s):
    return html.escape("" if s is None else str(s), quote=True)


def load(name, default=None):
    path = os.path.join(ROOT, "data", name)
    if not os.path.exists(path):
        return default
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def dims(rel):
    """Intrinsic size of a local image, so the browser can reserve space for it."""
    if rel in _SIZES:
        return _SIZES[rel]
    size = None
    path = os.path.join(ROOT, rel)
    if Image and os.path.exists(path):
        try:
            with Image.open(path) as im:
                size = im.size
        except Exception:
            size = None
    _SIZES[rel] = size
    return size


def img_tag(rel, alt="", lazy=True):
    size = dims(rel)
    wh = ' width="%d" height="%d"' % size if size else ""
    return '<img src="%s" alt="%s"%s%s>' % (
        esc(rel), esc(alt), wh, ' loading="lazy" decoding="async"' if lazy else "")


def surname(name):
    return (name or "").split()[-1].lower()


def host_of(url):
    return re.sub(r"^https?://(www\.)?", "", url or "").rstrip("/")


# --------------------------------------------------------------------------- #
# laboratories and testbeds
# --------------------------------------------------------------------------- #

def _lab_card(lab, heading="h3"):
    name, url = esc(lab.get("name")), esc(lab.get("url") or "")
    title = ('<a class="card-link" href="%s">%s</a>' % (url, name)) if url else name
    return (
        '<li class="card-container">\n'
        '  <div class="card card--border">\n'
        '    <div class="card-body">\n'
        '      %s'
        '      <%s class="card-title">%s</%s>\n'
        '      <p class="card-summary">%s</p>\n'
        '    </div>\n'
        '  </div>\n'
        '</li>' % (
            ('<p class="card-label">%s</p>\n      ' % esc(lab["area"])) if lab.get("area") else "",
            heading, title, heading, esc(lab.get("blurb") or "")))


def labs_all():
    return "\n".join(_lab_card(l) for l in (load("labs.json") or []))


def labs_preview(count=6):
    return "\n".join(_lab_card(l) for l in (load("labs.json") or [])[:count])


def testbed_cards():
    out = []
    for t in (load("testbeds.json") or []):
        out.append(
            '<li class="card-container">\n'
            '  <div class="card card--border">\n'
            '    <div class="card-body">\n'
            '      <h3 class="card-title">%s</h3>\n'
            '      <p class="card-summary">%s</p>\n'
            '    </div>\n'
            '  </div>\n'
            '</li>' % (esc(t.get("name")), esc(t.get("blurb") or "")))
    return "\n".join(out)


def stats():
    """The theme's Stat component, with the numbers counted from the data itself."""
    rows = [
        (len(load("faculty.json") or []), "Faculty"),
        (len(load("labs.json") or []), "Laboratories"),
        (len(load("testbeds.json") or []), "Collaborative testbeds"),
        ("%s+" % f"{(load('publications.json') or {}).get('total', 0):,}",
         "Publications since %s" % (load("publications.json") or {}).get("minYear", "")),
    ]
    return "\n".join(
        '<li class="stat-item stat-item--center">\n'
        '  <span class="stat-value">%s</span>\n'
        '  <span class="stat-label">%s</span>\n'
        '</li>' % (esc(n), esc(label)) for n, label in rows)


# --------------------------------------------------------------------------- #
# people
# --------------------------------------------------------------------------- #

def _person_card(f):
    photo = ("assets/faculty/%s" % f["photo"]) if f.get("photo") else None
    figure = ('<figure class="avatar avatar--sm card-image">%s</figure>'
              % img_tag(photo, "")) if photo else ""
    links = []
    if f.get("lab") and f.get("lab_url"):
        links.append('<a href="%s">%s</a>' % (esc(f["lab_url"]), esc(f["lab"])))
    if f.get("openalex_id"):
        links.append('<a href="https://openalex.org/%s">Publications</a>' % esc(f["openalex_id"]))
    return (
        '<li class="card-container">\n'
        '  <div class="card card--person card--stacked">\n'
        '    %s\n'
        '    <div class="card-body">\n'
        '      <h3 class="card-title">%s</h3>\n'
        '      %s\n'
        '    </div>\n'
        '  </div>\n'
        '</li>' % (figure, esc(f.get("name")),
                   ('<p class="card-meta">%s</p>' % " &middot; ".join(links)) if links else ""))


def _faculty(affiliated):
    people = [f for f in (load("faculty.json") or []) if bool(f.get("affiliated")) is affiliated]
    people.sort(key=lambda f: surname(f.get("name")))
    return "\n".join(_person_card(f) for f in people)


def faculty_members():
    return _faculty(False)


def faculty_affiliated():
    return _faculty(True)


def _roster(rows, render):
    return ('<ul class="list--unstyled roster">\n%s\n</ul>'
            % "\n".join(render(r) for r in rows)) if rows else "<p>None listed.</p>"


def _named(entry):
    name, url = esc(entry.get("name")), entry.get("url")
    return ('<a href="%s">%s</a>' % (esc(url), name)) if url else name


def students_list():
    rows = sorted(load("students.json") or [], key=lambda s: surname(s.get("name")))
    return _roster(rows, lambda s:
                   '  <li><b>%s</b> <span class="roster-meta">%s</span></li>'
                   % (_named(s), esc(" &middot; ".join(
                       x for x in [s.get("dept"), s.get("advisor"),
                                   "joined %s" % s["joined"] if s.get("joined") else None] if x
                   )).replace("&amp;middot;", "&middot;")))


def _alumni(key):
    rows = (load("alumni.json") or {}).get(key) or []
    return _roster(rows, lambda a:
                   '  <li><b>%s</b> <span class="roster-year">%s</span>'
                   ' <span class="roster-meta">%s</span></li>'
                   % (_named(a), esc(a.get("year") or ""),
                      esc(" &middot; ".join(x for x in [a.get("dept"), a.get("advisor"),
                                                        a.get("position")] if x))
                      .replace("&amp;middot;", "&middot;")))


def alumni_phd():
    return _alumni("phd")


def alumni_ms():
    return _alumni("ms")


def count_students():
    return str(len(load("students.json") or []))


def count_phd():
    return str(len((load("alumni.json") or {}).get("phd") or []))


def count_ms():
    return str(len((load("alumni.json") or {}).get("ms") or []))


# --------------------------------------------------------------------------- #
# publications
# --------------------------------------------------------------------------- #

def _norm(s):
    s = re.sub(r"[^a-z ]", " ", (s or "").lower())
    return re.sub(r"\s+", " ", s).strip()


def _key(name):
    parts = _norm(name).split()
    return (parts[0] + " " + parts[-1]) if len(parts) >= 2 else ""


def _members():
    """Who counts as one of ours, for highlighting authors on the publication list.

    Faculty are matched on their OpenAlex author id, which is unambiguous; students
    have no id in the data, so they fall back to a first+last name key, which is what
    the old client-side code used and survives middle initials.
    """
    ids, keys = set(), set()
    for f in (load("faculty.json") or []):
        if f.get("openalex_id"):
            ids.add(f["openalex_id"])
        ids.update(f.get("openalex_ids") or [])
        keys.add(_key(f.get("name")))
    for s in (load("students.json") or []):
        keys.add(_key(s.get("name")))
    return ids - {""}, keys - {""}


def publications_summary():
    pubs = load("publications.json") or {}
    return ("%s publications since %s from across the initiative, synchronised weekly from %s."
            % (f"{pubs.get('total', 0):,}", pubs.get("minYear", ""),
               esc(pubs.get("source", "OpenAlex"))))


def publications_anchors():
    pubs = load("publications.json") or {"years": []}
    return "\n      ".join('<li><a href="#y%s">%s</a></li>' % (g["year"], g["year"])
                           for g in pubs.get("years", []) if g.get("year"))


def publications_list():
    pubs = load("publications.json") or {"years": []}
    ids, keys = _members()
    out = []
    for group in pubs.get("years", []):
        items = []
        for w in group.get("items", []):
            names = []
            for a in (w.get("authors") or [])[:10]:
                who = a.get("name") if isinstance(a, dict) else a
                aid = a.get("id") if isinstance(a, dict) else None
                ours = (aid in ids) or (_key(who) in keys)
                names.append(("<b>%s</b>" % esc(who)) if ours else esc(who))
            more = len(w.get("authors") or []) - len(names)
            if more > 0:
                names.append('<span class="pub-more">and %d more</span>' % more)
            link = w.get("doi") or w.get("id")
            title = esc(w.get("title"))
            items.append(
                '  <li class="pub">\n'
                '    <p class="pub-title">%s</p>\n'
                '    <p class="card-meta">%s</p>\n'
                '    <p class="card-meta">%s</p>\n'
                '  </li>' % (
                    ('<a href="%s">%s</a>' % (esc(link), title)) if link else title,
                    ", ".join(names),
                    " &middot; ".join(x for x in [esc(w.get("venue")), esc(w.get("year"))] if x)))
        out.append(
            '<section class="section pub-year" data-year="%s">\n'
            '  <h2 class="section-title section-title--sm" id="y%s">%s '
            '<span class="pub-count">%s</span></h2>\n'
            '  <ul class="list--unstyled pub-list">\n%s\n  </ul>\n'
            '</section>' % (esc(group.get("year")), esc(group.get("year")),
                            esc(group.get("year")), group.get("count", 0), "\n".join(items)))
    return "\n".join(out)


# --------------------------------------------------------------------------- #
# gallery
# --------------------------------------------------------------------------- #

def gallery_items():
    out = []
    for g in (load("gallery.json") or []):
        out.append(
            '<li class="card-container">\n'
            '  <div class="card">\n'
            '    <figure class="card-image">%s</figure>\n'
            '    <div class="card-body">\n'
            '      <h3 class="card-title"><a class="card-link" href="%s">%s</a></h3>\n'
            '    </div>\n'
            '  </div>\n'
            '</li>' % (img_tag(g["src"], ""), esc(g.get("url") or "#"), esc(g.get("lab") or "")))
    return "\n".join(out)


TOKENS = {
    "LABS_ALL": labs_all,
    "LABS_PREVIEW": labs_preview,
    "TESTBEDS": testbed_cards,
    "STATS": stats,
    "FACULTY_MEMBERS": faculty_members,
    "FACULTY_AFFILIATED": faculty_affiliated,
    "STUDENTS": students_list,
    "ALUMNI_PHD": alumni_phd,
    "ALUMNI_MS": alumni_ms,
    "COUNT_STUDENTS": count_students,
    "COUNT_PHD": count_phd,
    "COUNT_MS": count_ms,
    "PUBLICATIONS_SUMMARY": publications_summary,
    "PUBLICATIONS_ANCHORS": publications_anchors,
    "PUBLICATIONS_LIST": publications_list,
    "GALLERY": gallery_items,
}


def expand(text):
    for key, fn in TOKENS.items():
        token = "{{%s}}" % key
        if token in text:
            text = text.replace(token, fn())
    return text
