// Marshall Web Co. — navigation, interactive sections and the contact form

(function () {
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  // Mobile nav
  var toggle = $(".nav-toggle");
  var nav = $("#site-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  var year = $("#year");
  if (year) year.textContent = new Date().getFullYear();

  // Header shadow and mobile CTA bar appear once the visitor scrolls
  var header = $(".site-header");
  var callbar = $(".callbar");
  function onScroll() {
    var y = window.scrollY;
    if (header) header.classList.toggle("scrolled", y > 10);
    if (callbar) callbar.classList.toggle("show", y > 500);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // Fade sections in as they scroll into view
  var reveals = $$(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -60px 0px" });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("in"); });
  }

  // Before / after slider
  var ba = $("#ba");
  if (ba) {
    var range = $("input", ba);
    var set = function () { ba.style.setProperty("--pos", range.value + "%"); };
    range.addEventListener("input", set);
    set();
  }

  // Pricing toggle: upfront vs $0-upfront monthly
  var priceToggle = $("#price-toggle");
  if (priceToggle) {
    $$("button", priceToggle).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var mode = btn.dataset.mode;
        $$("button", priceToggle).forEach(function (b) { b.setAttribute("aria-pressed", b === btn); });
        $$("[data-upfront]").forEach(function (el) { el.innerHTML = el.dataset[mode]; });
      });
    });
  }

  // ROI calculator
  var calc = $("#calc");
  if (calc) {
    var money = function (n) { return "$" + Math.round(n).toLocaleString("en-AU"); };
    var job = $("#r-job"), leads = $("#r-leads"), close = $("#r-close");
    var update = function () {
      var jobs = leads.value * close.value / 100;
      var month = jobs * job.value;
      $("#o-job").textContent = money(job.value);
      $("#o-leads").textContent = leads.value;
      $("#o-close").textContent = close.value + "%";
      $("#o-jobs").textContent = jobs.toFixed(1);
      $("#o-month").textContent = money(month);
      $("#o-year").textContent = money(month * 12);
      var multiple = month / 99;
      $("#o-badge").textContent = multiple >= 1.5
        ? "That's about " + Math.round(multiple) + "× what a Growth plan costs each month."
        : "Even one extra job a month goes a long way toward paying for the site.";
    };
    [job, leads, close].forEach(function (el) { el.addEventListener("input", update); });
    update();
  }

  // Free website check using Google PageSpeed Insights (mobile)
  var checkForm = $("#check-form");
  if (checkForm) {
    var report = $("#report");
    var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
    var ring = function (label, score) {
      var v = Math.round(score * 100);
      var c = v >= 90 ? "#2e9e5b" : v >= 50 ? "#d99a14" : "#d14343";
      return '<div class="score"><div class="ring" style="--v:' + v + ";--c:" + c + '"><b>' + v + "</b></div>" + label + "</div>";
    };
    checkForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var raw = $("#check-url").value.trim();
      if (!raw) return;
      var url = /^https?:\/\//i.test(raw) ? raw : "https://" + raw;
      var btn = $("button", checkForm);
      btn.disabled = true;
      report.innerHTML = '<div class="loader"><div class="spinner"></div><b>Checking ' + esc(raw) + "…</b><p>Google is loading your site on a simulated phone. This takes 15–30 seconds.</p></div>";

      var api = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed?strategy=mobile" +
        "&category=performance&category=accessibility&category=best-practices&category=seo&url=" + encodeURIComponent(url);
      fetch(api)
        .then(function (r) { if (!r.ok) throw new Error("status " + r.status); return r.json(); })
        .then(function (data) {
          var lh = data.lighthouseResult, cats = lh.categories, audits = lh.audits;
          var pass = function (id) { return audits[id] && audits[id].score === 1; };
          var lcp = audits["largest-contentful-paint"];
          var lcpSecs = lcp ? lcp.numericValue / 1000 : null;
          var items = [];
          items.push(lcpSecs === null ? "" : lcpSecs <= 2.5
            ? '<li>Main content loads in ' + lcpSecs.toFixed(1) + "s on mobile. Nice and quick.</li>"
            : '<li class="' + (lcpSecs > 4 ? "bad" : "warn") + '">Main content takes ' + lcpSecs.toFixed(1) + "s to load on mobile. Many visitors leave before then.</li>");
          items.push(pass("viewport") ? "<li>Set up for mobile screens.</li>" : '<li class="bad">Not set up properly for mobile screens.</li>');
          items.push(pass("is-on-https") ? "<li>Secure (https).</li>" : '<li class="bad">Not fully secure. Browsers may warn visitors.</li>');
          items.push(pass("meta-description") ? "<li>Has a Google search description.</li>" : '<li class="warn">Missing a description for Google search results.</li>');
          var perf = cats.performance.score;
          var verdict = perf >= 0.9 ? "Your site is in great shape on speed."
            : perf >= 0.5 ? "There's room to improve, and faster sites win more calls."
            : "Your site is losing visitors on phones. This is very fixable.";
          report.innerHTML =
            "<h3>Results for " + esc(raw) + "</h3><p class='fine' style='margin-top:-4px'>Mobile scores out of 100, from Google</p>" +
            '<div class="scores">' + ring("Speed", perf) + ring("SEO", cats.seo.score) + ring("Accessibility", cats.accessibility.score) + ring("Best practice", cats["best-practices"].score) + "</div>" +
            '<ul class="findings">' + items.join("") + "</ul>" +
            "<p><b>" + verdict + "</b></p>" +
            '<a class="btn btn-go" href="contact.html?site=' + encodeURIComponent(raw) + '">Get a free mockup that fixes this →</a>';
        })
        .catch(function () {
          report.innerHTML = '<div class="report-empty"><h3>Couldn\'t check that site</h3><p>Check the address is right, or Google may be busy. Try again in a minute, or <a href="contact.html?site=' + encodeURIComponent(raw) + '">ask me to review it for you</a>, free.</p></div>';
        })
        .then(function () { btn.disabled = false; });
    });
  }

  // Contact form: prefill from links (?package=growth, ?site=example.com.au)
  var params = new URLSearchParams(window.location.search);
  var pkg = params.get("package");
  if (pkg) { var opt = $('input[name="package"][value="' + pkg + '"]'); if (opt) opt.checked = true; }
  var site = params.get("site");
  if (site && $("#website")) $("#website").value = site;

  // Until a Formspree form ID is set, fall back to opening the visitor's email app
  var form = $("#quote-form");
  if (!form) return;
  form.addEventListener("submit", function (e) {
    var status = $("#form-status");
    if ($(".hp input", form).value) { e.preventDefault(); return; }

    var data = new FormData(form);
    if (form.action.indexOf("YOUR_FORM_ID") !== -1) {
      e.preventDefault();
      var body = "";
      data.forEach(function (value, key) {
        if (key !== "_gotcha" && value) body += key + ": " + value + "\n";
      });
      window.location.href =
        "mailto:" + form.dataset.fallbackEmail +
        "?subject=" + encodeURIComponent("Free mockup request") +
        "&body=" + encodeURIComponent(body);
      return;
    }

    e.preventDefault();
    status.textContent = "Sending…";
    fetch(form.action, { method: "POST", body: data, headers: { Accept: "application/json" } })
      .then(function (res) {
        if (!res.ok) throw new Error("Request failed");
        form.reset();
        status.textContent = "Thanks! I'll be in touch within one business day.";
      })
      .catch(function () {
        status.textContent = "Something went wrong. Please email me instead.";
      });
  });
})();
