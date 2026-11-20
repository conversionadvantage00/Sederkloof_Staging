/* Sederkloof Lodge — site behaviour (no dependencies) */
(function () {
  "use strict";

  /* ------------------------------------------------------------------
     Contact form endpoint.
     The old site posted to the CA Microsites API, which a static site
     can't use. Paste a form-service URL here (e.g. Formspree, Basin,
     Web3Forms, Netlify Forms) to make the form send. Until then the
     form tells visitors to phone or book online instead.
  ------------------------------------------------------------------ */
  var FORM_ENDPOINT = "";

  var doc = document;
  var $ = function (sel, ctx) { return (ctx || doc).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); };

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var root = doc.documentElement;

  /* ---------- Header: frosted after the hero; slips away scrolling down, returns scrolling up ---------- */
  var header = $(".site-header");
  if (header) {
    var lastY = window.scrollY;
    var onScroll = function () {
      var y = window.scrollY;
      if (!header.classList.contains("site-header--solid")) header.classList.toggle("is-solid", y > 40);
      if (doc.body.classList.contains("nav-open") || doc.querySelector("dialog[open]")) { lastY = y; return; }
      var d = y - lastY;
      if (Math.abs(d) < 6) return; // ignore tiny jitters
      header.classList.toggle("is-hidden", d > 0 && y > window.innerHeight * 0.5);
      lastY = y;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    // keyboard users tabbing into the header always get it back
    header.addEventListener("focusin", function () { header.classList.remove("is-hidden"); });
  }

  /* ---------- Mobile nav (full-screen; links stagger in) ---------- */
  var toggle = $(".nav-toggle");
  var setNav = function (open) {
    doc.body.classList.toggle("nav-open", open);
    if (toggle) toggle.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) { header && header.classList.remove("is-hidden"); pauseScroll(); } else { resumeScroll(); }
  };
  if (toggle) {
    $$(".nav > *").forEach(function (el, i) { el.style.setProperty("--i", i); });
    toggle.addEventListener("click", function () { setNav(!doc.body.classList.contains("nav-open")); });
    $$(".nav a").forEach(function (a) { a.addEventListener("click", function () { setNav(false); }); });
    doc.addEventListener("keydown", function (e) { if (e.key === "Escape" && doc.body.classList.contains("nav-open")) setNav(false); });
  }

  /* ---------- Page transitions: fallback fade-out for browsers without cross-document View Transitions ---------- */
  if (!reduceMotion && !window.CSSViewTransitionRule) {
    doc.addEventListener("click", function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target.closest && e.target.closest("a[href]");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      var url = new URL(a.href, location.href);
      if (url.origin !== location.origin || !/\.html$|\/$/.test(url.pathname)) return;
      var norm = function (p) { return p.replace(/index\.html$/, ""); };
      if (norm(url.pathname) === norm(location.pathname)) return; // same page (anchor links glide instead)
      e.preventDefault();
      root.classList.add("is-leaving");
      setTimeout(function () { location.href = url.href; }, 380);
    });
    // coming back via the back button restores the page from cache: make sure it's visible
    window.addEventListener("pageshow", function () { root.classList.remove("is-leaving"); });
  }

  /* ---------- Smooth scroll (Lenis, kept subtle; touch scrolling stays native) ---------- */
  var lenis = null;
  if (!reduceMotion && typeof window.Lenis === "function") {
    lenis = new window.Lenis({ lerp: 0.1, wheelMultiplier: 0.95, smoothWheel: true });
    window.sederkloofLenis = lenis; // handy for debugging in the console
    var raf = function (t) { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);

    // In-page anchor links glide instead of jumping
    var samePage = function (u) { return u.pathname.replace(/index\.html$/, "") === location.pathname.replace(/index\.html$/, ""); };
    doc.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest('a[href*="#"]');
      if (!a || a.target === "_blank") return;
      var url = new URL(a.href, location.href);
      if (!samePage(url) || !url.hash) return;
      var target = doc.getElementById(decodeURIComponent(url.hash.slice(1)));
      if (!target) return;
      e.preventDefault();
      var offset = (header ? header.offsetHeight : 0) + 12;
      lenis.scrollTo(target, { offset: -offset, duration: 1.4 });
      history.replaceState(null, "", url.hash);
    });
  }
  var pauseScroll = function () { if (lenis) lenis.stop(); };
  var resumeScroll = function () { if (lenis && !doc.querySelector("dialog[open]")) lenis.start(); };

  /* ---------- Feather reveal: entrance and exit as sections scroll in and out ---------- */
  var reveals = $$(".reveal");
  if (!reduceMotion && "IntersectionObserver" in window) {
    root.classList.add("motion");
    reveals.forEach(function (el) {
      Array.prototype.forEach.call(el.children, function (child, i) { child.style.setProperty("--i", Math.min(i, 8)); });
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var el = e.target;
        if (e.isIntersecting) {
          el.classList.add("is-visible");
          el.classList.remove("is-above");
        } else {
          el.classList.remove("is-visible");
          el.classList.toggle("is-above", e.boundingClientRect.top < 0);
        }
      });
    }, { rootMargin: "-4% 0px -10% 0px", threshold: 0 });
    reveals.forEach(function (el) {
      // anything already on screen at load shows straight away (doesn't wait for the observer)
      var r = el.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.9 && r.bottom > 0) el.classList.add("is-visible");
      io.observe(el);
    });
  } else {
    root.classList.remove("motion");
  }
  window.__revealReady = true;

  /* ---------- Tabs ---------- */
  /* Switching: old panel drifts up and fades (CSS .is-leaving), the stage eases from the old
     height to the new one, then the new cards feather in one by one (.is-entering removed). */
  var GLIDE = "cubic-bezier(0.45, 0, 0.15, 1)";
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

      // a switch still in progress is finished instantly before starting the next
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
          var anim = stage.animate([{ height: from + "px" }, { height: to + "px" }], { duration: 750, easing: GLIDE });
          anim.onfinish = anim.oncancel = function () { stage.classList.remove("is-resizing"); };
        }
        void next.offsetWidth; // commit the hidden starting state before letting the cards in
        requestAnimationFrame(function () { next.classList.remove("is-entering"); });
      }, 420);
    };
    buttons.forEach(function (b, i) {
      b.addEventListener("click", function () { select(b); });
      b.addEventListener("keydown", function (e) {
        var n = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if (!n) return;
        var next = buttons[(i + n + buttons.length) % buttons.length];
        next.focus(); select(next);
      });
    });
  });

  /* ---------- Checklist tables ---------- */
  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function renderChecklist(el) {
    var key = el.getAttribute("data-checklist");
    var data = window.SEDERKLOOF_CHECKLISTS && window.SEDERKLOOF_CHECKLISTS[key];
    if (!data || !data.rows || !data.rows.length) { el.remove(); return; }

    var html = '<div class="checklist__bar"><h3>' + escapeHtml(data.title || "Checklist") + "</h3>" +
      '<input type="search" placeholder="Search this list…" aria-label="Search ' + escapeHtml(data.title || key) + '"></div>' +
      '<p class="checklist__count"></p><div class="table-wrap"><table><thead><tr>' +
      data.columns.map(function (c) { return "<th>" + escapeHtml(c) + "</th>"; }).join("") +
      "</tr></thead><tbody>" +
      data.rows.map(function (r) {
        return "<tr>" + r.map(function (c) { return "<td>" + escapeHtml(c) + "</td>"; }).join("") + "</tr>";
      }).join("") +
      "</tbody></table></div>";

    var notes = (data.source ? [data.source] : []).concat(data.notes || []);
    if (notes.length) {
      html += '<div class="checklist__notes">' + notes.map(function (n) { return "<p>" + escapeHtml(n) + "</p>"; }).join("") + "</div>";
    }
    el.innerHTML = html;

    var rows = $$("tbody tr", el);
    var count = $(".checklist__count", el);
    var input = $("input", el);
    var update = function () {
      var q = input.value.trim().toLowerCase();
      var shown = 0;
      rows.forEach(function (tr) {
        var hit = !q || tr.textContent.toLowerCase().indexOf(q) !== -1;
        tr.hidden = !hit;
        if (hit) shown++;
      });
      count.textContent = q ? shown + " of " + rows.length + " entries" : rows.length + " entries";
    };
    input.addEventListener("input", update);
    update();
  }

  /* ---------- Detail pop-ups (content lives in <template> tags) ---------- */
  var detail = doc.getElementById("detail");
  var lastTrigger = null;

  function openDetail(id, trigger) {
    var tpl = doc.getElementById(id);
    if (!detail || !tpl) return;
    var body = $(".detail__content", detail);
    body.innerHTML = "";
    body.appendChild(tpl.content.cloneNode(true));
    $$("[data-checklist]", body).forEach(renderChecklist);
    lastTrigger = trigger || null;
    detail.showModal();
    detail.scrollTop = 0;
    pauseScroll();
  }

  $$("[data-detail]").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      openDetail(btn.getAttribute("data-detail"), btn);
    });
  });

  /* ---------- Lightbox ---------- */
  var lightbox = doc.getElementById("lightbox");
  var lbImg = lightbox && $("img", lightbox);
  var lbCap = lightbox && $(".lightbox__caption", lightbox);
  var lbSet = [];
  var lbIndex = 0;

  function showLb(i) {
    lbIndex = (i + lbSet.length) % lbSet.length;
    var item = lbSet[lbIndex];
    lbImg.src = item.src;
    lbImg.alt = item.alt;
    lbCap.textContent = lbSet.length > 1 ? (lbIndex + 1) + " / " + lbSet.length : "";
  }
  function openLb(set, i) {
    if (!lightbox) return;
    lbSet = set; showLb(i);
    $$(".lightbox__nav", lightbox).forEach(function (b) { b.hidden = set.length < 2; });
    if (!lightbox.open) lightbox.showModal();
    pauseScroll();
  }

  doc.addEventListener("click", function (e) {
    var t = e.target.closest("[data-lightbox]");
    if (!t) return;
    e.preventDefault();
    var group = t.getAttribute("data-lightbox");
    var scope = t.closest("dialog") || doc;
    var items = $$('[data-lightbox="' + group + '"]', scope);
    var set = items.map(function (el) {
      var img = el.tagName === "IMG" ? el : $("img", el);
      return { src: el.getAttribute("data-full") || img.currentSrc || img.src, alt: img.alt || "" };
    });
    openLb(set, items.indexOf(t));
  });

  if (lightbox) {
    $(".lightbox__prev", lightbox).addEventListener("click", function () { showLb(lbIndex - 1); });
    $(".lightbox__next", lightbox).addEventListener("click", function () { showLb(lbIndex + 1); });
    lightbox.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") showLb(lbIndex + 1);
      if (e.key === "ArrowLeft") showLb(lbIndex - 1);
    });
  }

  /* Close buttons, backdrop click and Escape: fade out gently (CSS .is-closing), then close */
  function closeDialog(dlg) {
    if (!dlg.open || dlg.classList.contains("is-closing")) return;
    if (reduceMotion) { dlg.close(); return; }
    dlg.classList.add("is-closing");
    setTimeout(function () { dlg.classList.remove("is-closing"); dlg.close(); }, 480);
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

  /* ---------- Contact form ---------- */
  var form = doc.getElementById("enquiry-form");
  if (form) {
    var status = $(".form__status", form);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (form.website && form.website.value) return; // honeypot
      var phone = '<a href="tel:+27877004334">+27 87 700 4334</a>';
      var book = '<a href="https://book.nightsbridge.com/17306" target="_blank" rel="noopener">book online</a>';

      if (!FORM_ENDPOINT) {
        status.innerHTML = "Our online enquiry form isn't connected yet. Please call us on " + phone + " or " + book + ".";
        status.hidden = false;
        return;
      }
      var btn = $('button[type="submit"]', form);
      btn.disabled = true;
      status.hidden = true;
      fetch(FORM_ENDPOINT, { method: "POST", body: new FormData(form), headers: { Accept: "application/json" } })
        .then(function (r) {
          if (!r.ok) throw new Error("bad status");
          form.reset();
          status.textContent = "Thank you, your enquiry has been sent. We'll be in touch soon.";
        })
        .catch(function () {
          status.innerHTML = "Sorry, something went wrong sending your message. Please call us on " + phone + " or " + book + ".";
        })
        .then(function () { status.hidden = false; btn.disabled = false; });
    });
  }

  /* ---------- Footer year ---------- */
  $$("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
