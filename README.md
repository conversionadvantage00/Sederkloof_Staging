# Sederkloof Lodge website (v3)

Static rebuild of [sederklooflodge.co.za](https://sederklooflodge.co.za/), staged on GitHub Pages.

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

## Deploying to GitHub Pages

1. Push the contents of this folder to the root of the repo.
2. Repo **Settings → Pages → Build and deployment**: Source = *Deploy from a branch*, Branch = `main`, folder = `/ (root)`.
3. The site appears at `https://<user>.github.io/<repo>/`.

`.nojekyll` is included so GitHub serves every file as-is.

## Staging vs live

- On any host other than `sederklooflodge.co.za`, pages add `noindex` and skip Google Analytics, so staging is not indexed and doesn't count in the lodge's stats.
- On the live domain, Google Analytics (`G-4QT7G3JRPF`) loads and pages are indexable. Nothing needs changing at go-live.

## Known gaps

- Enquiry form isn't connected: set `FORM_ENDPOINT` at the top of `assets/js/main.js` to a form service URL.
- Booking links go to NightsBridge (`book.nightsbridge.com/17306`); no embedded widget yet.
