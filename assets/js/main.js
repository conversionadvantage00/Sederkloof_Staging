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

  /* ---------- Header: solid after scrolling past hero ---------- */
  var header = $(".site-header");
  if (header && !header.classList.contains("site-header--solid")) {
    var onScroll = function () { header.classList.toggle("is-solid", window.scrollY > 60); };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---------- Mobile nav ---------- */
  var toggle = $(".nav-toggle");
  if (toggle) {
    toggle.addEventListener("click", function () {
      var open = doc.body.classList.toggle("nav-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    $$(".nav a").forEach(function (a) {
      a.addEventListener("click", function () {
        doc.body.classList.remove("nav-open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ---------- Reveal on scroll ---------- */
  var reveals = $$(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("is-visible"); io.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px" });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* ---------- Tabs ---------- */
  $$("[data-tabs]").forEach(function (wrap) {
    var buttons = $$('[role="tab"]', wrap);
    var select = function (btn) {
      buttons.forEach(function (b) {
        var on = b === btn;
        b.setAttribute("aria-selected", on ? "true" : "false");
        b.tabIndex = on ? 0 : -1;
        var panel = doc.getElementById(b.getAttribute("aria-controls"));
        if (panel) panel.hidden = !on;
      });
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

  /* Close buttons + click on backdrop */
  $$("dialog").forEach(function (dlg) {
    $$("[data-close]", dlg).forEach(function (b) { b.addEventListener("click", function () { dlg.close(); }); });
    dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener("close", function () {
      if (dlg === detail && lastTrigger) { lastTrigger.focus(); lastTrigger = null; }
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
