// Marshall Web Co. — mobile nav, footer year, contact form

(function () {
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("site-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  // Pre-select a package when arriving from a pricing button (contact.html?package=growth)
  var pkg = new URLSearchParams(window.location.search).get("package");
  var select = document.getElementById("package");
  if (pkg && select) {
    for (var i = 0; i < select.options.length; i++) {
      if (select.options[i].value === pkg) select.selectedIndex = i;
    }
  }

  // Until a Formspree form ID is set, fall back to opening the visitor's email app
  var form = document.getElementById("quote-form");
  if (!form) return;
  form.addEventListener("submit", function (e) {
    var status = document.getElementById("form-status");
    if (form.querySelector(".hp input").value) { e.preventDefault(); return; }

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
        status.textContent = "Something went wrong. Please call or email instead.";
      });
  });
})();
