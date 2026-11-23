# Sederkloof Lodge website (v3)

Static rebuild of [sederklooflodge.co.za](https://sederklooflodge.co.za/), hosted on Cloudflare Pages (auto-deploys from this repo).

## Pages

| File | Page |
|---|---|
| `index.html` | Home: welcome, location, rooms preview, specials, experiences, conservation, nature guide, travel guide, gallery |
| `rooms.html` | All 8 units with descriptions and booking buttons |
| `contact.html` | Contact details, enquiry form, map, directions |

## Folders

```
assets/
  css/styles.css        all styles
  js/main.js            nav, pop-ups, lightbox, tabs, checklist tables, form
  data/checklists.js    species checklists + medicinal glossary (transcribed from scans)
  images/               all photos, grouped by section
```

No build step, no dependencies. Open `index.html` locally or push the folder as-is.

## Hosting (Cloudflare Pages)

- Code lives in GitHub; Cloudflare Pages deploys every push to `main` automatically.
- Pages settings: Framework preset = None, Build command = (blank), Output directory = `/`.
- Live address: `https://www.sederklooflodge.co.za` (CNAME to the `*.pages.dev` project). The bare domain 301-redirects to www.
- `_headers` sets caching and keeps `*.pages.dev` previews out of Google.

## Staging vs live

- On any host other than `sederklooflodge.co.za` / `www.`, pages add `noindex` and skip Google Analytics.
- On the live domain, Google Analytics (`G-4QT7G3JRPF`) loads and pages are indexable.
- Canonical / og:url tags point to `https://www.sederklooflodge.co.za/`.

## Contact form

Uses mailto: the visitor's email app opens with the enquiry filled in. Set `ENQUIRY_EMAIL` at the top of `assets/js/main.js`.

## Booking

Booking links go to NightsBridge (`book.nightsbridge.com/17306`).
