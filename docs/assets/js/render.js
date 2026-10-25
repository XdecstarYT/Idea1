// Shared HTML for pricing. Used by site/build.js (baked into the pages) and by
// main.js in the browser (refreshed with live prices from Supabase).
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.MWCRender = factory();
})(typeof self !== "undefined" ? self : this, function () {
  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function money(n) {
    return "$" + Number(n).toLocaleString("en-AU");
  }

  function byKind(products, kind) {
    return products
      .filter(function (p) { return p.kind === kind && p.active !== false; })
      .sort(function (a, b) { return a.sort - b.sort; });
  }

  function perDay(monthly) { return "That's about $" + (monthly * 12 / 365).toFixed(2) + " a day"; }

  // mode is "monthly" or "upfront"; both versions are stored on the element for the toggle
  function packageCard(p, mode, careFrom) {
    var monthly = p.price_monthly != null ? money(p.price_monthly) + "<small>/mo</small>" : money(p.price_upfront);
    var upfront = p.price_upfront != null ? money(p.price_upfront) : monthly;
    var altMonthly = p.price_monthly != null ? "$0 upfront · hosting &amp; care included" : "One-off price";
    var altUpfront = "One-off" + (careFrom ? " · hosting from " + money(careFrom) + "/mo" : "");
    var features = (p.features || []).map(function (f) { return "<li>" + esc(f) + "</li>"; }).join("");
    return (
      '<div class="glass price-card' + (p.featured ? " featured" : "") + '">' +
        (p.featured ? '<span class="ring-glow" aria-hidden="true"></span>' : "") +
        (p.badge ? '<span class="badge">' + esc(p.badge) + "</span>" : "") +
        "<h3>" + esc(p.name) + "</h3>" +
        '<p class="for">' + esc(p.tagline) + "</p>" +
        '<div class="price" data-upfront="' + esc(upfront) + '" data-monthly="' + esc(monthly) + '">' + (mode === "upfront" ? upfront : monthly) + "</div>" +
        '<div class="price-alt" data-upfront="' + esc(altUpfront) + '" data-monthly="' + esc(altMonthly) + '">' + (mode === "upfront" ? altUpfront : altMonthly) + "</div>" +
        // Daily framing makes a monthly cost easier to weigh up (Gourville, 1998)
        (p.price_monthly != null ? '<p class="per-day" data-upfront="" data-monthly="' + esc(perDay(p.price_monthly)) + '">' + (mode === "upfront" ? "" : perDay(p.price_monthly)) + "</p>" : "") +
        (p.delivery ? '<p class="delivery">Live in ' + esc(p.delivery) + "</p>" : "") +
        "<ul>" + features + "</ul>" +
        '<a class="btn ' + (p.featured ? "btn-go" : "btn-glass") + ' btn-block" href="contact.html?package=' + encodeURIComponent(p.slug) + '">Choose ' + esc(p.name) + "</a>" +
      "</div>"
    );
  }

  function careCard(p) {
    var features = (p.features || []).map(function (f) { return "<li>" + esc(f) + "</li>"; }).join("");
    return (
      '<div class="glass price-card">' +
        "<h3>" + esc(p.name) + "</h3>" +
        '<p class="for">' + esc(p.tagline) + "</p>" +
        '<div class="price">' + money(p.price_monthly) + "<small>/mo</small></div>" +
        "<ul>" + features + "</ul>" +
      "</div>"
    );
  }

  function addonRow(p) {
    var price = p.price_upfront != null ? money(p.price_upfront) : money(p.price_monthly) + "/mo";
    return "<tr><td><b>" + esc(p.name) + "</b></td><td>" + esc(p.tagline) + "</td><td>" + price + "</td></tr>";
  }

  function seatIcons(left, total) {
    var html = "";
    for (var i = 0; i < total; i++) html += i < total - left ? '<i class="taken"></i>' : "<i></i>";
    return html;
  }

  function cheapestCare(products) {
    var care = byKind(products, "care").map(function (p) { return p.price_monthly; }).filter(function (n) { return n != null; });
    return care.length ? Math.min.apply(null, care) : null;
  }

  return {
    esc: esc,
    money: money,
    // The plan the calculator compares against: the featured package with a monthly price, else the cheapest monthly package
    calcPlan: function (products) {
      var monthly = byKind(products, "package").filter(function (p) { return p.price_monthly != null; });
      var p = monthly.filter(function (x) { return x.featured; })[0] || monthly.sort(function (a, b) { return a.price_monthly - b.price_monthly; })[0];
      return p ? { name: p.name, monthly: p.price_monthly } : null;
    },
    packages: function (products, mode) {
      var careFrom = cheapestCare(products);
      return byKind(products, "package").map(function (p) { return packageCard(p, mode, careFrom); }).join("");
    },
    care: function (products) { return byKind(products, "care").map(careCard).join(""); },
    addons: function (products) { return byKind(products, "addon").map(addonRow).join(""); },
    seatIcons: seatIcons,
  };
});
