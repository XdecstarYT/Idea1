// Marshall Web Co. — motion, interactive sections, live data from Supabase and the lead form

(function () {
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var cfg = window.MWC_CONFIG || {};
  var R = window.MWCRender;

  // Minimal Supabase REST helper: public pages only read prices and submit leads,
  // so they don't need the full client library
  function api(path, options) {
    options = options || {};
    var headers = { apikey: cfg.supabaseAnonKey, Authorization: "Bearer " + cfg.supabaseAnonKey, "Content-Type": "application/json" };
    for (var k in options.headers || {}) headers[k] = options.headers[k];
    return fetch(cfg.supabaseUrl + "/rest/v1/" + path, { method: options.method || "GET", headers: headers, body: options.body })
      .then(function (res) {
        if (!res.ok) throw new Error("Supabase " + res.status);
        return res.status === 204 || res.status === 201 ? null : res.json();
      });
  }

  // Navigation
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

  // Light that follows the pointer across glass surfaces
  document.addEventListener("pointermove", function (e) {
    var el = e.target.closest && e.target.closest(".glass");
    if (!el) return;
    var r = el.getBoundingClientRect();
    el.style.setProperty("--mx", (e.clientX - r.left) + "px");
    el.style.setProperty("--my", (e.clientY - r.top) + "px");
  }, { passive: true });

  // Scroll-linked effects: product showcase zoom, mobile action bar, story progress
  var showcase = $("#showcase");
  var callbar = $(".callbar");
  var ticking = false;
  function onScroll() {
    ticking = false;
    var vh = window.innerHeight;
    if (showcase && !reduceMotion) {
      var top = showcase.getBoundingClientRect().top;
      var p = Math.min(1, Math.max(0, 1 - (top - 80) / (vh * 0.8)));
      showcase.style.setProperty("--p", p.toFixed(3));
    }
    if (callbar) callbar.classList.toggle("show", window.scrollY > 600);
  }
  window.addEventListener("scroll", function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  // Reveal on scroll, count-up numbers and story steps
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add("in");
        $$("[data-count]", e.target).forEach(countUp);
        io.unobserve(e.target);
      });
    }, { rootMargin: "0px 0px -8% 0px" });
    $$(".reveal").forEach(function (el) { io.observe(el); });

    var steps = $$("#steps .step");
    var rail = $("#story-rail");
    if (steps.length) {
      var stepIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          var i = steps.indexOf(e.target);
          steps.forEach(function (s, j) { s.classList.toggle("active", j <= i); });
          if (rail) rail.style.setProperty("--sp", ((i + 1) / steps.length).toFixed(2));
        });
      }, { rootMargin: "-45% 0px -45% 0px" });
      steps.forEach(function (s) { stepIO.observe(s); });
    }
  } else {
    $$(".reveal, .step").forEach(function (el) { el.classList.add("in", "active"); });
  }

  function countUp(el) {
    var target = +el.dataset.count;
    if (reduceMotion || !target) { el.textContent = target; return; }
    var start = performance.now();
    (function frame(now) {
      var t = Math.min(1, (now - start) / 1400);
      el.textContent = Math.round(target * (1 - Math.pow(1 - t, 3)));
      if (t < 1) requestAnimationFrame(frame);
    })(start);
  }

  // Netflix-style row arrows
  $$("[data-row]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var row = document.getElementById(btn.dataset.row);
      row.scrollBy({ left: row.clientWidth * 0.8 * +btn.dataset.dir, behavior: reduceMotion ? "auto" : "smooth" });
    });
  });

  // Before / after slider
  var ba = $("#ba");
  if (ba) {
    var baRange = $("input", ba);
    var setBa = function () { ba.style.setProperty("--pos", baRange.value + "%"); };
    baRange.addEventListener("input", setBa);
    setBa();
  }

  // Pricing toggle (also re-applied after live prices load)
  var priceMode = "monthly";
  function applyPriceMode() {
    $$("[data-price-toggle] button").forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.mode === priceMode); });
    $$("[data-upfront]").forEach(function (el) { el.innerHTML = el.dataset[priceMode]; });
  }
  $$("[data-price-toggle] button").forEach(function (btn) {
    btn.addEventListener("click", function () { priceMode = btn.dataset.mode; applyPriceMode(); });
  });

  // ROI calculator
  var calc = $("#calc");
  if (calc) {
    var money = function (n) { return "$" + Math.round(n).toLocaleString("en-AU"); };
    var job = $("#r-job"), leads = $("#r-leads"), close = $("#r-close");
    var fill = function (el) { el.style.setProperty("--fill", ((el.value - el.min) / (el.max - el.min) * 100) + "%"); };
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
      [job, leads, close].forEach(fill);
    };
    [job, leads, close].forEach(function (el) { el.addEventListener("input", update); });
    update();
  }

  // Free website check (Google PageSpeed Insights, mobile)
  var checkForm = $("#check-form");
  if (checkForm) {
    var report = $("#report");
    var esc = R ? R.esc : function (s) { return s; };
    var ring = function (label, score) {
      var v = Math.round(score * 100);
      var c = v >= 90 ? "#34c47c" : v >= 50 ? "#f3d47a" : "#ff5a5f";
      return '<div class="score"><div class="ring" style="--v:' + v + ";--c:" + c + '"><b>' + v + "</b></div>" + label + "</div>";
    };
    checkForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var raw = $("#check-url").value.trim();
      if (!raw) return;
      var url = /^https?:\/\//i.test(raw) ? raw : "https://" + raw;
      var btn = $("button", checkForm);
      btn.disabled = true;
      report.innerHTML = '<div class="loader"><div class="spinner"></div><b style="color:#fff">Checking ' + esc(raw) + "…</b><p>Google is loading your site on a simulated phone. This takes 15–30 seconds.</p></div>";
      fetch("https://www.googleapis.com/pagespeedonline/v5/runPagespeed?strategy=mobile&category=performance&category=accessibility&category=best-practices&category=seo&url=" + encodeURIComponent(url))
        .then(function (r) { if (!r.ok) throw new Error("status " + r.status); return r.json(); })
        .then(function (data) {
          var cats = data.lighthouseResult.categories, audits = data.lighthouseResult.audits;
          var pass = function (id) { return audits[id] && audits[id].score === 1; };
          var lcp = audits["largest-contentful-paint"];
          var secs = lcp ? lcp.numericValue / 1000 : null;
          var items = [];
          if (secs !== null) items.push(secs <= 2.5
            ? "<li>Main content loads in " + secs.toFixed(1) + "s on mobile. Nice and quick.</li>"
            : '<li class="' + (secs > 4 ? "bad" : "warn") + '">Main content takes ' + secs.toFixed(1) + "s to load on mobile. Many visitors leave before then.</li>");
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
            '<ul class="findings">' + items.join("") + "</ul><p><b style='color:#fff'>" + verdict + "</b></p>" +
            '<a class="btn btn-primary" href="contact.html?site=' + encodeURIComponent(raw) + '">Get a free mockup that fixes this →</a>';
        })
        .catch(function () {
          report.innerHTML = '<div class="report-empty"><h3>Couldn\'t check that site</h3><p>Check the address is right, or Google may be busy. Try again in a minute, or <a href="contact.html?site=' + encodeURIComponent(raw) + '">ask me to review it for you</a>, free.</p></div>';
        })
        .then(function () { btn.disabled = false; });
    });
  }

  // Live prices and founding-spot settings from the owner panel
  if (cfg.supabaseUrl && R) {
    api("site_settings?select=founding_seats_left,founding_discount,announcement,show_announcement&id=eq.1")
      .then(function (rows) {
        var s = rows && rows[0];
        if (!s) return;
        $$("[data-seats-left]").forEach(function (el) { el.textContent = s.founding_seats_left; });
        $$("[data-discount]").forEach(function (el) { el.textContent = s.founding_discount; });
        $$("[data-seat-icons]").forEach(function (el) { el.innerHTML = R.seatIcons(s.founding_seats_left, 5); });
        $$("[data-announcement]").forEach(function (el) { el.textContent = s.announcement; });
        var bar = $("[data-announce-bar]");
        if (bar) bar.hidden = !s.show_announcement;
        if (s.founding_seats_left <= 0) $$("[data-founding]").forEach(function (el) { el.hidden = true; });
      })
      .catch(function () { /* keep the built-in values */ });

    if ($("[data-render]")) {
      api("products?select=*&active=eq.true&order=kind.asc,sort.asc")
        .then(function (products) {
          if (!products || !products.length) return;
          var map = { packages: R.packages(products, priceMode), care: R.care(products), addons: R.addons(products) };
          $$("[data-render]").forEach(function (el) { el.innerHTML = map[el.dataset.render]; });
          applyPriceMode();
        })
        .catch(function () { /* keep the built-in prices */ });
    }
  }

  // Contact form: prefill from links, then save the lead to Supabase
  var params = new URLSearchParams(window.location.search);
  var pkg = params.get("package");
  if (pkg) { var opt = $('input[name="package"][value="' + pkg + '"]'); if (opt) opt.checked = true; }
  var site = params.get("site");
  if (site && $("#website")) $("#website").value = site;

  var form = $("#quote-form");
  if (!form) return;
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var status = $("#form-status");
    if ($(".hp input", form).value) return;
    var missing = $$("[required]", form).filter(function (el) { return !el.value.trim(); });
    if (missing.length) {
      status.className = "form-status err";
      status.textContent = "Please fill in your name, business and phone.";
      missing[0].focus();
      return;
    }
    var data = new FormData(form);
    var val = function (k) { var v = (data.get(k) || "").toString().trim(); return v || null; };
    var lead = { name: val("name"), business: val("business"), phone: val("phone"), email: val("email"), website: val("website"), industry: val("industry"), package: val("package"), message: val("message") };
    var btn = $("button[type=submit]", form);
    btn.disabled = true;
    status.className = "form-status";
    status.textContent = "Sending…";

    api("leads", { method: "POST", body: JSON.stringify(lead), headers: { Prefer: "return=minimal" } })
      .then(function () {
        $("#form-wrap").innerHTML =
          '<div class="success-panel"><div class="tick"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg></div>' +
          "<h2 style='font-size:2.4rem'>Got it, " + R.esc(lead.name.split(" ")[0]) + "!</h2>" +
          "<p class='lead' style='margin:0 auto'>I'll be in touch within one business day, and your free mockup will follow in about 72 hours.</p></div>";
      })
      .catch(function () {
        // Fall back to the visitor's email app so the enquiry isn't lost
        var body = Object.keys(lead).filter(function (k) { return lead[k]; }).map(function (k) { return k + ": " + lead[k]; }).join("\n");
        status.className = "form-status err";
        status.innerHTML = "Couldn't send just now. <a href=\"mailto:" + form.dataset.fallbackEmail + "?subject=" + encodeURIComponent("Free mockup request") + "&body=" + encodeURIComponent(body) + "\">Email your request instead →</a>";
        btn.disabled = false;
      });
  });
})();
