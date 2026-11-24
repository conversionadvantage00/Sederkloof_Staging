/* Sederkloof Lodge — site behaviour (v2). No build step; Lenis is the only optional dependency. */
(function () {
  "use strict";

  /* ------------------------------------------------------------------
     Settings
     FORM_ENDPOINT: Conversion Advantage forms (site: Sederkloof).
     ENQUIRY_EMAIL: backup only. If sending fails, the visitor's email
       app opens with the enquiry filled in, addressed here.
     NB: NightsBridge booking page. Accepts ?startdate=YYYY-MM-DD&enddate=YYYY-MM-DD
  ------------------------------------------------------------------ */
  var FORM_ENDPOINT = "https://forms.conversionadvantage.com/f/y9khkn7hm7";
  var ENQUIRY_EMAIL = "jean@conversionadvantage.com"; // TEMP for testing. Go-live: "hbekker@moonstoneinfo.com,simone@conversionadvantage.com"
  var NB = "https://book.nightsbridge.com/17306";
  var TEL_HTML = '<a href="tel:+27877004334">+27 87 700 4334</a>';

  var doc = document;
  var root = doc.documentElement;
  var $ = function (sel, ctx) { return (ctx || doc).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); };
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var store = {
    get: function (k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }
  };

  /* ==================================================================
     Measurement
     Every meaningful action goes through track(). On the live domain it
     goes to GA4 (gtag). Everywhere else it's logged to the console, and
     with ?debug=1 in the URL a panel shows each event as it fires.
     Events: begin_booking, dates_selected, click_call, click_directions,
     enquire_click, view_item, view_item_list, select_content, filter_stays,
     form_start, form_error, generate_lead
  ================================================================== */
  var DEBUG = /[?&]debug=1/.test(location.search) || store.get("sk_debug") === "1";
  if (DEBUG) store.set("sk_debug", "1");
  var panel = null;
  function track(name, params) {
    params = params || {};
    params.page_path = location.pathname;
    if (window.gtag) window.gtag("event", name, params);
    if (!window.SK_PROD || DEBUG) {
      if (window.console) console.log("%c[track] " + name, "color:#a65a30;font-weight:600", params);
    }
    if (DEBUG) {
      if (!panel) { panel = doc.createElement("div"); panel.className = "track-debug"; panel.setAttribute("aria-hidden", "true"); doc.body.appendChild(panel); }
      var row = doc.createElement("div");
      var p = Object.keys(params).filter(function (k) { return k !== "page_path"; }).map(function (k) { return k + "=" + params[k]; }).join("  ");
      row.innerHTML = "<b>" + name + "</b><br>" + p.replace(/</g, "&lt;");
      panel.insertBefore(row, panel.firstChild);
    }
  }
  window.skTrack = track;

  /* ==================================================================
     Dates (shared by every booking bar and Book button on the site)
  ================================================================== */
  var pad = function (n) { return (n < 10 ? "0" : "") + n; };
  var iso = function (d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); };
  var parse = function (s) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ""); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };
  var addDays = function (d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; };
  var nightsBetween = function (a, b) { return Math.round((parse(b) - parse(a)) / 864e5); };
  var today = new Date(); today.setHours(0, 0, 0, 0);

  // Default: the coming weekend (Friday → Sunday), a sensible first suggestion for a getaway
  function defaultDates() {
    var fri = addDays(today, ((5 - today.getDay() + 7) % 7) || 7);
    return { ci: iso(fri), co: iso(addDays(fri, 2)) };
  }
  var dates = (function () {
    var ci = store.get("sk_ci"), co = store.get("sk_co");
    if (parse(ci) && parse(co) && parse(ci) >= today && parse(co) > parse(ci)) return { ci: ci, co: co, chosen: true };
    var d = defaultDates(); d.chosen = false; return d;
  })();

  function bookingUrl() { return NB + "?startdate=" + dates.ci + "&enddate=" + dates.co; }

  var bookForms = $$("[data-book-form]");
  function paintDates() {
    var n = nightsBetween(dates.ci, dates.co);
    bookForms.forEach(function (f) {
      f.checkin.value = dates.ci; f.checkin.min = iso(today);
      f.checkout.value = dates.co; f.checkout.min = iso(addDays(parse(dates.ci), 1));
      var nEl = $("[data-nights]", f);
      if (nEl) nEl.textContent = n > 0 ? n + (n === 1 ? " night" : " nights") : "";
    });
    $$("a[data-book]").forEach(function (a) { a.href = bookingUrl(); });
  }
  function setDates(ci, co, placement) {
    if (!parse(ci)) return;
    if (parse(ci) < today) ci = iso(today);
    if (!parse(co) || parse(co) <= parse(ci)) co = iso(addDays(parse(ci), Math.max(1, nightsBetween(dates.ci, dates.co) || 2)));
    dates.ci = ci; dates.co = co; dates.chosen = true;
    store.set("sk_ci", ci); store.set("sk_co", co);
    paintDates();
    track("dates_selected", { placement: placement, check_in: ci, nights: nightsBetween(ci, co) });
  }

  bookForms.forEach(function (f) {
    var placement = f.getAttribute("data-placement") || "booking_bar";
    f.checkin.addEventListener("change", function () { setDates(f.checkin.value, f.checkout.value, placement); });
    f.checkout.addEventListener("change", function () { setDates(f.checkin.value, f.checkout.value, placement); });
    // clicking anywhere on a field opens the date picker where the browser supports it
    $$(".book-bar__field", f).forEach(function (fld) {
      fld.addEventListener("click", function (e) {
        var inp = $("input", fld);
        if (e.target !== inp && inp.showPicker) { try { inp.showPicker(); } catch (err) { inp.focus(); } }
      });
    });
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      track("begin_booking", { placement: placement, check_in: dates.ci, check_out: dates.co, nights: nightsBetween(dates.ci, dates.co), stay: "any" });
      window.open(bookingUrl(), "_blank", "noopener");
    });
  });
  paintDates();

  /* ==================================================================
     Click tracking (delegated): Book buttons + anything with data-track
  ================================================================== */
  doc.addEventListener("click", function (e) {
    var el = e.target.closest && e.target.closest("a[data-book], [data-track]");
    if (!el) return;
    var p = { placement: el.getAttribute("data-placement") || "unknown" };
    if (el.hasAttribute("data-stay")) p.stay = el.getAttribute("data-stay");
    if (el.matches("a[data-book]")) {
      el.href = bookingUrl();
      p.check_in = dates.ci; p.check_out = dates.co; p.nights = nightsBetween(dates.ci, dates.co);
      p.dates_chosen = dates.chosen ? "yes" : "default";
      if (!p.stay) p.stay = "any";
      track("begin_booking", p);
      return;
    }
    var name = el.getAttribute("data-track");
    if (el.hasAttribute("data-content")) p.content_type = el.getAttribute("data-content");
    if (el.hasAttribute("data-item")) p.item_id = el.getAttribute("data-item");
    if (name === "select_content" && !p.item_id) {
      var h = el.closest(".card") && $("h3", el.closest(".card"));
      p.item_id = h ? h.textContent.trim() : el.getAttribute("data-detail");
    }
    if (p.placement === "unknown") delete p.placement;
    track(name, p);
  }, true);

  /* ==================================================================
     Header: transparent over the hero, solid after; hides scrolling down
  ================================================================== */
  var header = $(".site-header");
  var hero = $(".hero");
  if (header) {
    var lastY = window.scrollY;
    var onScroll = function () {
      var y = window.scrollY;
      if (!header.classList.contains("site-header--solid")) header.classList.toggle("is-solid", y > (hero ? hero.offsetHeight - 90 : 40));
      if (doc.body.classList.contains("nav-open") || doc.querySelector("dialog[open]")) { lastY = y; return; }
      var d = y - lastY;
      if (Math.abs(d) < 6) return;
      var hide = d > 0 && y > window.innerHeight * 0.7;
      header.classList.toggle("is-hidden", hide);
      doc.body.classList.toggle("header-hidden", hide);
      lastY = y;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    header.addEventListener("focusin", function () { header.classList.remove("is-hidden"); doc.body.classList.remove("header-hidden"); });
  }

  /* ---------- Mobile nav ---------- */
  var toggle = $(".nav-toggle");
  var lenis = null;
  var pauseScroll = function () { if (lenis) lenis.stop(); };
  var resumeScroll = function () { if (lenis && !doc.querySelector("dialog[open]") && !doc.body.classList.contains("nav-open")) lenis.start(); };
  var setNav = function (open) {
    doc.body.classList.toggle("nav-open", open);
    if (toggle) toggle.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) { header && header.classList.remove("is-hidden"); pauseScroll(); } else { resumeScroll(); }
  };
  if (toggle) {
    toggle.addEventListener("click", function () { setNav(!doc.body.classList.contains("nav-open")); });
    $$(".nav a").forEach(function (a) { a.addEventListener("click", function () { setNav(false); }); });
    doc.addEventListener("keydown", function (e) { if (e.key === "Escape" && doc.body.classList.contains("nav-open")) setNav(false); });
  }

  /* ---------- Smooth scroll (Lenis; touch stays native) ---------- */
  if (!reduceMotion && typeof window.Lenis === "function") {
    lenis = new window.Lenis({ lerp: 0.11, wheelMultiplier: 0.95, smoothWheel: true });
    var raf = function (t) { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }
  // In-page anchors glide (with Lenis) or scroll smoothly (without)
  doc.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest('a[href*="#"]');
    if (!a || a.target === "_blank") return;
    var url = new URL(a.href, location.href);
    var norm = function (p) { return p.replace(/index(\.html)?$/, "").replace(/\.html$/, ""); };
    if (norm(url.pathname) !== norm(location.pathname) || !url.hash) return;
    var target = doc.getElementById(decodeURIComponent(url.hash.slice(1)));
    if (!target) return;
    e.preventDefault();
    var offset = 84;
    if (lenis) lenis.scrollTo(target, { offset: -offset, duration: 1.3 });
    else window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - offset, behavior: reduceMotion ? "auto" : "smooth" });
    history.replaceState(null, "", url.hash);
  });

  /* ---------- Reveal on scroll (once) ---------- */
  var reveals = $$(".reveal, .reveal-img");
  if (!reduceMotion && "IntersectionObserver" in window) {
    root.classList.add("motion");
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("is-visible"); io.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.01 });
    reveals.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.95 && r.bottom > 0) el.classList.add("is-visible");
      else io.observe(el);
    });
  } else {
    root.classList.remove("motion");
    reveals.forEach(function (el) { el.classList.add("is-visible"); });
  }
  window.__revealReady = true;

  /* ---------- Statement: words light up as it scrolls through the screen ---------- */
  $$("[data-words]").forEach(function (el) {
    if (reduceMotion) { el.parentNode.classList.add("no-split"); return; }
    var words = [];
    var wrap = function (node, accent) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = doc.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(doc.createTextNode(part)); return; }
            var s = doc.createElement("span"); s.className = "w" + (accent ? " accent" : ""); s.textContent = part;
            words.push(s); frag.appendChild(s);
          });
          n.parentNode.replaceChild(frag, n);
        } else if (n.nodeType === 1) {
          wrap(n, accent || n.classList.contains("accent"));
        }
      });
    };
    wrap(el, false);
    var update = function () {
      var r = el.getBoundingClientRect(), vh = window.innerHeight;
      var progress = (vh * 0.85 - r.top) / (r.height + vh * 0.35);
      var lit = Math.round(Math.max(0, Math.min(1, progress)) * words.length);
      words.forEach(function (w, i) { w.classList.toggle("on", i < lit); });
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
  });

  /* ---------- Stay filters ---------- */
  $$(".filters").forEach(function (group) {
    var list = group.parentNode.querySelector("[data-stays]");
    if (!list) return;
    var btns = $$(".filter", group);
    btns.forEach(function (b) {
      b.addEventListener("click", function () {
        var f = b.getAttribute("data-filter");
        btns.forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
        $$(".stay", list).forEach(function (card) {
          var show = f === "all" || card.getAttribute("data-kind") === f;
          card.hidden = !show;
          if (show) card.classList.add("is-visible");
        });
        track("filter_stays", { filter: f });
      });
    });
  });

  /* ---------- Rail (experiences) ---------- */
  $$("[data-rail]").forEach(function (rail) {
    var nav = rail.closest("section") && $("[data-rail-nav]", rail.closest("section"));
    if (!nav) return;
    var prev = $('[data-dir="-1"]', nav), next = $('[data-dir="1"]', nav);
    var step = function () { var c = rail.firstElementChild; return c ? c.getBoundingClientRect().width + 18 : 300; };
    var sync = function () {
      prev.disabled = rail.scrollLeft < 8;
      next.disabled = rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 8;
    };
    prev.addEventListener("click", function () { rail.scrollBy({ left: -step(), behavior: "smooth" }); });
    next.addEventListener("click", function () { rail.scrollBy({ left: step(), behavior: "smooth" }); });
    rail.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    sync();
  });

  /* ---------- Tabs (nature guide) ---------- */
  var GLIDE = "cubic-bezier(0.65, 0, 0.35, 1)";
  $$("[data-tabs]").forEach(function (wrap) {
    var buttons = $$('[role="tab"]', wrap);
    var stage = $(".tab-stage", wrap);
    var panelOf = function (b) { return doc.getElementById(b.getAttribute("aria-controls")); };
    var timer = null;
    buttons.forEach(function (b) {
      var p = panelOf(b);
      if (p) $$(".grid > *", p).forEach(function (c, i) { c.style.setProperty("--i", Math.min(i, 8)); });
    });
    var select = function (btn) {
      var current = null;
      buttons.forEach(function (b) {
        var on = b === btn;
        b.setAttribute("aria-selected", on ? "true" : "false");
        b.tabIndex = on ? 0 : -1;
        var p = panelOf(b);
        if (p && !p.hidden && !on) current = p;
      });
      var next = panelOf(btn);
      if (!next || (!current && !next.hidden && !timer)) return;
      track("select_content", { content_type: "nature_tab", item_id: $(".guide-tab__title", btn).textContent });
      if (timer) { clearTimeout(timer); timer = null; }
      $$(".tab-panel", wrap).forEach(function (p) { p.classList.remove("is-leaving", "is-entering"); if (p !== next) p.hidden = true; });
      if (reduceMotion || !stage || !current) { next.hidden = false; return; }
      current.hidden = false;
      current.classList.add("is-leaving");
      timer = setTimeout(function () {
        timer = null;
        var from = stage.offsetHeight;
        current.hidden = true;
        current.classList.remove("is-leaving");
        next.classList.add("is-entering");
        next.hidden = false;
        var to = stage.offsetHeight;
        if (stage.animate && Math.abs(to - from) > 2) {
          stage.classList.add("is-resizing");
          var anim = stage.animate([{ height: from + "px" }, { height: to + "px" }], { duration: 650, easing: GLIDE });
          anim.onfinish = anim.oncancel = function () { stage.classList.remove("is-resizing"); };
        }
        void next.offsetWidth;
        requestAnimationFrame(function () { next.classList.remove("is-entering"); });
      }, 380);
    };
    buttons.forEach(function (b, i) {
      b.addEventListener("click", function () { select(b); });
      b.addEventListener("keydown", function (e) {
        var n = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if (!n) return;
        var nb = buttons[(i + n + buttons.length) % buttons.length];
        nb.focus(); select(nb);
      });
    });
  });

  /* ---------- Checklist tables ---------- */
  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; });
  }
  function renderChecklist(el) {
    var key = el.getAttribute("data-checklist");
    var data = window.SEDERKLOOF_CHECKLISTS && window.SEDERKLOOF_CHECKLISTS[key];
    if (!data || !data.rows || !data.rows.length) { el.remove(); return; }
    var html = '<div class="checklist__bar"><h3>' + escapeHtml(data.title || "Checklist") + "</h3>" +
      '<input type="search" placeholder="Search this list…" aria-label="Search ' + escapeHtml(data.title || key) + '"></div>' +
      '<p class="checklist__count"></p><div class="table-wrap"><table><thead><tr>' +
      data.columns.map(function (c) { return "<th>" + escapeHtml(c) + "</th>"; }).join("") + "</tr></thead><tbody>" +
      data.rows.map(function (r) { return "<tr>" + r.map(function (c) { return "<td>" + escapeHtml(c) + "</td>"; }).join("") + "</tr>"; }).join("") +
      "</tbody></table></div>";
    var notes = (data.source ? [data.source] : []).concat(data.notes || []);
    if (notes.length) html += '<div class="checklist__notes">' + notes.map(function (n) { return "<p>" + escapeHtml(n) + "</p>"; }).join("") + "</div>";
    el.innerHTML = html;
    var rows = $$("tbody tr", el), count = $(".checklist__count", el), input = $("input", el);
    var update = function () {
      var q = input.value.trim().toLowerCase(), shown = 0;
      rows.forEach(function (tr) { var hit = !q || tr.textContent.toLowerCase().indexOf(q) !== -1; tr.hidden = !hit; if (hit) shown++; });
      count.textContent = q ? shown + " of " + rows.length + " entries" : rows.length + " entries";
    };
    input.addEventListener("input", update);
    update();
  }

  /* ---------- Detail pop-ups (content in <template>); each ends with a next step ---------- */
  var detail = doc.getElementById("detail");
  var lastTrigger = null;
  function openDetail(id, trigger) {
    var tpl = doc.getElementById(id);
    if (!detail || !tpl) return;
    var body = $(".detail__content", detail);
    body.innerHTML = "";
    body.appendChild(tpl.content.cloneNode(true));
    $$("[data-checklist]", body).forEach(renderChecklist);
    $$(".text-link", body).forEach(function (a) { a.className = "link"; });
    var cta = doc.createElement("div");
    cta.className = "detail__cta";
    cta.innerHTML = "<p>See it for yourself.</p>" +
      '<div class="btn-row"><a class="btn btn--clay btn--sm" target="_blank" rel="noopener" data-book data-placement="detail_' + id + '" href="' + bookingUrl() + '">Check availability</a>' +
      '<a class="btn btn--ghost btn--sm" href="rooms.html">See the stays</a></div>';
    body.appendChild(cta);
    lastTrigger = trigger || null;
    detail.showModal();
    body.scrollTop = 0;
    body.setAttribute("tabindex", "-1");
    body.focus({ preventScroll: true });
    pauseScroll();
  }
  $$("[data-detail]").forEach(function (btn) {
    btn.addEventListener("click", function (e) { e.preventDefault(); openDetail(btn.getAttribute("data-detail"), btn); });
  });

  /* ---------- Lightbox ---------- */
  var lightbox = doc.getElementById("lightbox");
  var lbImg = lightbox && $("img", lightbox);
  var lbCap = lightbox && $(".lightbox__caption", lightbox);
  var lbSet = [], lbIndex = 0;
  function showLb(i) {
    lbIndex = (i + lbSet.length) % lbSet.length;
    lbImg.src = lbSet[lbIndex].src; lbImg.alt = lbSet[lbIndex].alt;
    lbCap.textContent = lbSet.length > 1 ? (lbIndex + 1) + " / " + lbSet.length : lbSet[lbIndex].alt;
  }
  function openLb(set, i) {
    if (!lightbox) return;
    lbSet = set; showLb(i);
    $$(".lightbox__nav", lightbox).forEach(function (b) { b.hidden = set.length < 2; });
    if (!lightbox.open) lightbox.showModal();
    pauseScroll();
  }
  doc.addEventListener("click", function (e) {
    var t = e.target.closest && e.target.closest("[data-lightbox]");
    if (!t) return;
    e.preventDefault();
    var group = t.getAttribute("data-lightbox");
    var scope = t.closest("dialog") || doc;
    var items = $$('[data-lightbox="' + group + '"]', scope);
    var set = items.map(function (el) { var img = el.tagName === "IMG" ? el : $("img", el); return { src: el.getAttribute("data-full") || img.currentSrc || img.src, alt: img.alt || "" }; });
    if (scope === doc) track("select_content", { content_type: "gallery", item_id: group });
    openLb(set, items.indexOf(t));
  });
  if (lightbox) {
    $(".lightbox__prev", lightbox).addEventListener("click", function () { showLb(lbIndex - 1); });
    $(".lightbox__next", lightbox).addEventListener("click", function () { showLb(lbIndex + 1); });
    lightbox.addEventListener("keydown", function (e) { if (e.key === "ArrowRight") showLb(lbIndex + 1); if (e.key === "ArrowLeft") showLb(lbIndex - 1); });
  }

  function closeDialog(dlg) {
    if (!dlg.open || dlg.classList.contains("is-closing")) return;
    if (reduceMotion) { dlg.close(); return; }
    dlg.classList.add("is-closing");
    setTimeout(function () { dlg.classList.remove("is-closing"); dlg.close(); }, 430);
  }
  $$("dialog").forEach(function (dlg) {
    $$("[data-close]", dlg).forEach(function (b) { b.addEventListener("click", function () { closeDialog(dlg); }); });
    dlg.addEventListener("click", function (e) { if (e.target === dlg) closeDialog(dlg); });
    dlg.addEventListener("cancel", function (e) { e.preventDefault(); closeDialog(dlg); });
    dlg.addEventListener("close", function () {
      if (dlg === detail && lastTrigger) { lastTrigger.focus({ preventScroll: true }); lastTrigger = null; }
      resumeScroll();
    });
  });

  /* ---------- Mobile action bar: appears once you're past the hero ---------- */
  var bar = $(".mobile-bar");
  if (bar) {
    var footer = $(".site-footer");
    var onBar = function () {
      var past = window.scrollY > (hero ? hero.offsetHeight * 0.7 : 200);
      var nearEnd = footer && footer.getBoundingClientRect().top < window.innerHeight - 40;
      bar.classList.toggle("is-shown", past && !nearEnd && !doc.body.classList.contains("nav-open"));
    };
    onBar();
    window.addEventListener("scroll", onBar, { passive: true });
  }

  /* ---------- Rooms page: sub-nav follows the room in view; each room counts as a view ---------- */
  var rooms = $$(".room[id]");
  if (rooms.length && "IntersectionObserver" in window) {
    var subLinks = $$(".subnav a[data-sub]");
    var seen = {};
    var ro = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var id = en.target.id;
        subLinks.forEach(function (a) {
          var on = a.getAttribute("href") === "#" + id;
          a.classList.toggle("is-active", on);
          if (on && a.scrollIntoView && a.parentNode.scrollWidth > a.parentNode.clientWidth) {
            a.parentNode.scrollTo({ left: a.offsetLeft - 40, behavior: "smooth" });
          }
        });
        if (!seen[id]) { seen[id] = true; track("view_item", { stay: en.target.getAttribute("data-room"), placement: "rooms_scroll" }); }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    rooms.forEach(function (r) { ro.observe(r); });
  }

  /* ==================================================================
     Enquiry form
  ================================================================== */
  var form = doc.getElementById("enquiry-form");
  if (form) {
    var status = $(".form__status", form);
    var val = function (n) { return form[n] ? String(form[n].value || "").trim() : ""; };
    var show = function (html) { status.innerHTML = html; status.hidden = false; };

    // Pre-fill from the page the visitor came from (?stay=) and from dates they already picked
    var qs = new URLSearchParams(location.search);
    var stay = qs.get("stay");
    if (stay) {
      var norm = function (s) { return s.replace(/[’']/g, "'").toLowerCase(); };
      Array.prototype.forEach.call(form.accommodation.options, function (o) { if (norm(o.text) === norm(stay)) form.accommodation.value = o.value || o.text; });
    }
    if (dates.chosen) { form.arrival.value = dates.ci; form.departure.value = dates.co; }
    form.arrival.min = iso(today);
    form.arrival.addEventListener("change", function () {
      if (parse(form.arrival.value)) {
        form.departure.min = iso(addDays(parse(form.arrival.value), 1));
        if (!parse(form.departure.value) || parse(form.departure.value) <= parse(form.arrival.value)) form.departure.value = iso(addDays(parse(form.arrival.value), 2));
      }
    });

    var started = false;
    form.addEventListener("focusin", function () {
      if (started) return; started = true;
      track("form_start", { form: "enquiry", stay: val("accommodation") || "any" });
    });

    var fieldOf = function (el) { return el.closest(".field"); };
    var validate = function () {
      var bad = [];
      [["name", function (v) { return v.length > 1; }], ["email", function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); }]].forEach(function (rule) {
        var ok = rule[1](val(rule[0]));
        fieldOf(form[rule[0]]).classList.toggle("is-invalid", !ok);
        if (!ok) bad.push(rule[0]);
      });
      var a = parse(val("arrival")), d = parse(val("departure"));
      var datesOk = !(a && d && d <= a);
      fieldOf(form.departure).classList.toggle("is-invalid", !datesOk);
      if (!datesOk) bad.push("dates");
      return bad;
    };
    ["name", "email", "departure"].forEach(function (n) {
      form[n].addEventListener("input", function () { if (fieldOf(form[n]).classList.contains("is-invalid")) validate(); });
    });

    var mailtoLink = function () {
      var lines = ["Name: " + val("name"), "Email: " + val("email"), "Phone: " + val("phone"),
        "Interested in: " + (val("accommodation") || "Any / not sure"), "Arrival: " + val("arrival"), "Departure: " + val("departure"),
        "Guests: " + val("guests"), "Occasion: " + val("occasion"), "", val("message")];
      return "mailto:" + ENQUIRY_EMAIL + "?subject=" + encodeURIComponent("Website enquiry - " + val("name")) + "&body=" + encodeURIComponent(lines.join("\n"));
    };

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (val("_gotcha")) return; // spam trap
      var bad = validate();
      if (bad.length) {
        track("form_error", { form: "enquiry", fields: bad.join(",") });
        var first = $(".field.is-invalid input", form); if (first) first.focus();
        return;
      }
      var data = new FormData(form);
      data.append("_subject", "Website enquiry - " + val("name") + (val("accommodation") ? " (" + val("accommodation") + ")" : ""));
      var btn = $('button[type="submit"]', form);
      btn.disabled = true; btn.style.opacity = "0.7";
      show("Sending…");
      var nights = parse(val("arrival")) && parse(val("departure")) ? nightsBetween(val("arrival"), val("departure")) : 0;
      fetch(FORM_ENDPOINT, { method: "POST", body: data, headers: { Accept: "application/json" } })
        .then(function (r) { return r.json(); })
        .then(function (out) {
          if (!out || !out.ok) throw new Error("not sent");
          track("generate_lead", { form: "enquiry", stay: val("accommodation") || "any", nights: nights, guests: val("guests") || "n/a" });
          var first = val("name").split(" ")[0];
          form.innerHTML = '<div class="form__done"><div class="tick"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div>' +
            "<h2>Thank you" + (first ? ", " + escapeHtml(first) : "") + "</h2><p>Your enquiry is on its way. We’ll be in touch soon, usually within a day.</p>" +
            '<div class="btn-row" style="justify-content:center;margin-top:24px"><a class="btn btn--clay" target="_blank" rel="noopener" data-book data-placement="form_success" href="' + bookingUrl() + '">Check live availability</a>' +
            '<a class="btn btn--ghost" href="index.html#plan">Plan your trip</a></div></div>';
          form.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
        })
        .catch(function () {
          track("form_error", { form: "enquiry", fields: "send_failed" });
          var href = mailtoLink();
          show("Sorry, your message didn’t send. " + '<a href="' + href + '">Email it to us instead</a> or call ' + TEL_HTML + ".");
          window.location.href = href;
          btn.disabled = false; btn.style.opacity = "";
        });
    });
  }

  /* ---------- Footer year ---------- */
  $$("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
