# Sederkloof Lodge website (v4 redesign)

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

## Booking flow

- Every booking bar and "Book / Check dates" button sends guests to NightsBridge **with their dates**: `https://book.nightsbridge.com/17306?startdate=YYYY-MM-DD&enddate=YYYY-MM-DD`.
- Dates picked anywhere on the site carry across pages (sessionStorage). Default suggestion: the coming Friday to Sunday.
- The six chalets book online (NightsBridge lists them as Deluxe Twin / Deluxe Double). Camp Naguna and the Bush Cottage go to the enquiry form, pre-filled with the stay.

## Measurement (GA4 `G-4QT7G3JRPF`, live domain only)

| Event | When |
|---|---|
| `begin_booking` | Any click through to NightsBridge (placement, stay, check_in, nights) |
| `dates_selected` | Dates changed in a booking bar |
| `generate_lead` | Enquiry form sent successfully |
| `form_start` / `form_error` | Enquiry form started / failed validation or send |
| `click_call` / `click_directions` / `enquire_click` | Phone, directions, enquiry links (with placement) |
| `view_item` / `view_item_list` | Stay viewed (rooms page scroll, stay links) |
| `select_content` | Experiences, nature guide, travel guide, gallery |
| `filter_stays` | Stay filter used |

Mark `begin_booking`, `generate_lead` and `click_call` as **key events** in GA4 (Admin → Events).
Off the live domain, events log to the browser console. Add `?debug=1` to any URL to see them in an on-page panel.


## Contact form

Posts to Conversion Advantage forms (`FORM_ENDPOINT` in `assets/js/main.js`, site "Sederkloof"). Visitors stay on the page and see a thank-you message. If sending fails, their email app opens with the enquiry filled in, addressed to `ENQUIRY_EMAIL`.

## Booking

Booking links go to NightsBridge (`book.nightsbridge.com/17306`).
