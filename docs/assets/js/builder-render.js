// Site builder renderer: turns a design ({ theme, blocks }) into a complete, standalone web page.
// Used by the builder preview, the client review screen and "Export HTML".
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.MWCBuilder = factory();
})(typeof self !== "undefined" ? self : this, function () {
  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  // Only allow safe link types
  function url(v, fallback) {
    v = String(v == null ? "" : v).trim();
    if (!v) return fallback || "#";
    if (/^(https?:\/\/|mailto:|tel:|#)/i.test(v)) return v;
    if (/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(v)) return "https://" + v;
    return fallback || "#";
  }
  function img(v) {
    v = String(v == null ? "" : v).trim();
    return /^https:\/\/[^\s"'<>]+$/i.test(v) ? v : "";
  }
  function color(v, fallback) { return /^#[0-9a-f]{3,8}$/i.test(String(v || "")) ? v : fallback; }
  function lines(v) { return String(v || "").split("\n").map(function (s) { return s.trim(); }).filter(Boolean); }
  function uid() { return "b" + Math.random().toString(36).slice(2, 9); }
  function telLink(phone) { return phone ? "tel:" + String(phone).replace(/[^\d+]/g, "") : "#contact"; }

  var FONTS = {
    modern: { label: "Modern", head: "Inter Tight", body: "Inter", css: "Inter+Tight:wght@600;700;800&family=Inter:wght@400;500;600" },
    classic: { label: "Classic", head: "Fraunces", body: "Karla", css: "Fraunces:opsz,wght@9..144,600;9..144,800&family=Karla:wght@400;500;700" },
    elegant: { label: "Elegant", head: "Cormorant Garamond", body: "Manrope", css: "Cormorant+Garamond:wght@600;700&family=Manrope:wght@400;500;700" },
    bold: { label: "Bold", head: "Archivo", body: "Archivo", css: "Archivo:wght@400;500;700;800;900" },
    friendly: { label: "Friendly", head: "Nunito", body: "Nunito", css: "Nunito:wght@400;600;700;800;900" },
    street: { label: "Street", head: "Bungee", body: "Inter", css: "Bungee&family=Inter:wght@400;500;600;700" },
  };
  var RADIUS = { sharp: "4px", soft: "14px", round: "26px" };

  // ---------- Section types: editor fields, defaults and markup ----------
  var BLOCKS = {
    header: {
      label: "Header", icon: "☰", desc: "Logo, menu and call button",
      fields: [
        { key: "logo", label: "Business name / logo text", type: "text" },
        { key: "links", label: "Menu links", type: "list", item: [{ key: "text", label: "Text", type: "text" }, { key: "link", label: "Link", type: "text" }] },
        { key: "cta", label: "Button text", type: "text" },
        { key: "ctaLink", label: "Button link", type: "text", hint: "Leave empty to call your phone number" },
        { key: "auto", label: "Menu lists the site's pages", type: "toggle", hint: "Multi-page sites only. Turn off to use the links above." },
      ],
      defaults: function (t) { return { logo: t.business || "Your Business", links: [{ text: "Services", link: "#services" }, { text: "About", link: "#about" }, { text: "Contact", link: "#contact" }], cta: t.phone ? "Call " + t.phone : "Get a quote", ctaLink: "", auto: true }; },
      render: function (b, t, ctx) {
        var links = ctx.multi && b.auto ? menuPages(ctx).map(function (p) { return { text: p.title, link: "#/" + p.slug, nav: p.slug }; }) : (b.links || []);
        var nav = links.map(function (l) { return '<a href="' + esc(url(l.link)) + '"' + (l.nav ? ' data-nav="' + esc(l.nav) + '"' : "") + ">" + esc(l.text) + "</a>"; }).join("");
        var home = ctx.multi ? "#/" + ctx.pages[0].slug : "#top";
        return '<header class="hdr"><div class="wrap hdr-in"><a class="logo" href="' + esc(home) + '">' + esc(b.logo || t.business) + "</a>" +
          '<nav class="menu">' + nav + "</nav>" +
          '<div class="hdr-end">' + (b.cta ? '<a class="btn btn-p hdr-cta" href="' + esc(url(b.ctaLink, telLink(t.phone))) + '">' + esc(b.cta) + "</a>" : "") +
          (nav ? '<input type="checkbox" id="nav-t" class="nav-t" aria-label="Menu"><label for="nav-t" class="burger" aria-hidden="true"><i></i><i></i><i></i></label>' +
            '<nav class="drawer">' + nav + (b.cta ? '<a class="btn btn-p" href="' + esc(url(b.ctaLink, telLink(t.phone))) + '">' + esc(b.cta) + "</a>" : "") + "</nav>" : "") +
          "</div></div></header>";
      },
    },
    hero: {
      label: "Hero", icon: "★", desc: "Big headline and buttons",
      fields: [
        { key: "layout", label: "Layout", type: "select", options: [["centered", "Centred"], ["split", "Text + image"], ["full", "Full-screen photo"]] },
        { key: "eyebrow", label: "Small text above", type: "text" },
        { key: "heading", label: "Headline", type: "textarea" },
        { key: "text", label: "Sub-heading", type: "textarea" },
        { key: "button", label: "Main button", type: "text" },
        { key: "buttonLink", label: "Main button link", type: "text" },
        { key: "button2", label: "Second button", type: "text" },
        { key: "button2Link", label: "Second button link", type: "text" },
        { key: "image", label: "Image (https link)", type: "image" },
        { key: "badges", label: "Trust badges (one per line)", type: "textarea" },
      ],
      defaults: function (t) { return { layout: "centered", eyebrow: "Proudly local", heading: "A headline that says exactly what you do", text: "One or two sentences on why customers choose you.", button: "Get a free quote", buttonLink: "#contact", button2: "", button2Link: "", image: "", badges: "" }; },
      render: function (b, t) {
        if (b.layout === "full") {
          var bg = img(b.image);
          var fb = lines(b.badges);
          return '<section class="hero hero-full"' + (bg ? ' style="--bgimg:url(\'' + esc(bg) + '\')"' : "") + '><div class="wrap hero-in"><div class="hero-copy">' +
            (b.eyebrow ? '<span class="eyebrow">' + esc(b.eyebrow) + "</span>" : "") +
            "<h1>" + esc(b.heading).replace(/\n/g, "<br>") + "</h1>" +
            (b.text ? '<p class="lead">' + esc(b.text) + "</p>" : "") +
            '<div class="btns">' + (b.button ? '<a class="btn btn-p btn-lg" href="' + esc(url(b.buttonLink, "#contact")) + '">' + esc(b.button) + "</a>" : "") +
            (b.button2 ? '<a class="btn btn-o btn-lg" href="' + esc(url(b.button2Link)) + '">' + esc(b.button2) + "</a>" : "") + "</div>" +
            (fb.length ? '<ul class="badges">' + fb.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>" : "") +
            '</div></div><span class="scroll-cue" aria-hidden="true"></span></section>';
        }
        var media = b.layout === "split" ? '<div class="hero-media">' + (img(b.image) ? '<img src="' + esc(img(b.image)) + '" alt="">' : '<div class="ph ph-lg">✦</div>') + "</div>" : "";
        var badges = lines(b.badges);
        return '<section class="hero ' + (b.layout === "split" ? "hero-split" : "hero-center") + '"><div class="wrap hero-in"><div class="hero-copy">' +
          (b.eyebrow ? '<span class="eyebrow">' + esc(b.eyebrow) + "</span>" : "") +
          "<h1>" + esc(b.heading).replace(/\n/g, "<br>") + "</h1>" +
          (b.text ? '<p class="lead">' + esc(b.text) + "</p>" : "") +
          '<div class="btns">' + (b.button ? '<a class="btn btn-p btn-lg" href="' + esc(url(b.buttonLink, "#contact")) + '">' + esc(b.button) + "</a>" : "") +
          (b.button2 ? '<a class="btn btn-o btn-lg" href="' + esc(url(b.button2Link)) + '">' + esc(b.button2) + "</a>" : "") + "</div>" +
          (badges.length ? '<ul class="badges">' + badges.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>" : "") +
          "</div>" + media + "</div></section>";
      },
    },
    services: {
      label: "Services", icon: "▦", desc: "Grid of services with prices",
      fields: [
        { key: "heading", label: "Heading", type: "text" },
        { key: "intro", label: "Intro", type: "textarea" },
        { key: "items", label: "Services", type: "list", item: [{ key: "icon", label: "Emoji", type: "text" }, { key: "title", label: "Title", type: "text" }, { key: "text", label: "Description", type: "textarea" }, { key: "price", label: "Price (optional)", type: "text" }] },
      ],
      defaults: function () { return { heading: "What we do", intro: "", items: [{ icon: "🔧", title: "Service one", text: "A short description of this service.", price: "From $99" }, { icon: "⚡", title: "Service two", text: "A short description of this service.", price: "" }, { icon: "✅", title: "Service three", text: "A short description of this service.", price: "" }] }; },
      render: function (b) {
        return '<section class="sec" id="services"><div class="wrap">' + head(b.heading, b.intro) + '<div class="grid3">' +
          (b.items || []).map(function (i) {
            return '<div class="card">' + (i.icon ? '<div class="ic">' + esc(i.icon) + "</div>" : "") + "<h3>" + esc(i.title) + "</h3><p>" + esc(i.text) + "</p>" + (i.price ? '<div class="price-tag">' + esc(i.price) + "</div>" : "") + "</div>";
          }).join("") + "</div></div></section>";
      },
    },
    marquee: {
      label: "Marquee", icon: "↔", desc: "Scrolling banner of short phrases",
      fields: [
        { key: "text", label: "Phrases (one per line)", type: "textarea" },
        { key: "style", label: "Style", type: "select", options: [["brand", "Main colour"], ["dark", "Dark"], ["outline", "Outline"]] },
      ],
      defaults: function () { return { text: "Locally owned\nFree quotes\nFast service", style: "brand" }; },
      render: function (b) {
        var items = lines(b.text);
        var run = items.map(function (x) { return "<span>" + esc(x) + "</span>"; }).join("");
        return '<div class="mq mq-' + esc(b.style || "brand") + '" aria-label="' + esc(items.join(", ")) + '"><div class="mq-track" aria-hidden="true">' + run + run + run + run + "</div></div>";
      },
    },
    products: {
      label: "Products", icon: "🛍", desc: "Shop grid with photos, prices and links",
      fields: [
        { key: "eyebrow", label: "Small text above", type: "text" },
        { key: "heading", label: "Heading", type: "text" },
        { key: "intro", label: "Intro", type: "textarea" },
        { key: "columns", label: "Cards per row", type: "select", options: [["4", "4"], ["3", "3"], ["2", "2"]] },
        { key: "filters", label: "Show category filters", type: "toggle", hint: "Buttons above the grid built from each product's category." },
        { key: "soldText", label: "Label for sold products", type: "text", hint: "e.g. Sold, Claimed, Sold out" },
        { key: "items", label: "Products", type: "list", item: [{ key: "image", label: "Photo (https link)", type: "image" }, { key: "name", label: "Name", type: "text" }, { key: "detail", label: "Short description", type: "textarea" }, { key: "price", label: "Price", type: "text" }, { key: "tag", label: "Tag (e.g. New, 1 of 1)", type: "text" }, { key: "group", label: "Category (for filters)", type: "text" }, { key: "link", label: "Shop link", type: "text" }, { key: "sold", label: "Sold / claimed", type: "toggle" }] },
        { key: "button", label: "Button below the grid", type: "text" },
        { key: "buttonLink", label: "Button link", type: "text" },
      ],
      defaults: function () { return { eyebrow: "", heading: "Shop", intro: "", columns: "4", items: [{ image: "", name: "Product one", detail: "", price: "$20", tag: "New", link: "" }, { image: "", name: "Product two", detail: "", price: "$30", tag: "", link: "" }, { image: "", name: "Product three", detail: "", price: "$40", tag: "", link: "" }, { image: "", name: "Product four", detail: "", price: "$50", tag: "", link: "" }], button: "", buttonLink: "" }; },
      render: function (b) {
        var items = b.items || [];
        var groups = [];
        items.forEach(function (i) { var g = String(i.group || "").trim(); if (g && groups.indexOf(g) < 0) groups.push(g); });
        var anySold = items.some(function (i) { return i.sold; });
        var sold = b.soldText || "Sold";
        var chips = b.filters && (groups.length > 1 || anySold) ? '<div class="chips" role="group" aria-label="Filter products"><button type="button" class="chip on" data-f="">All <small>' + items.length + "</small></button>" +
          groups.map(function (g) { return '<button type="button" class="chip" data-f="' + esc(g) + '">' + esc(g) + " <small>" + items.filter(function (i) { return String(i.group || "").trim() === g; }).length + "</small></button>"; }).join("") +
          (anySold ? '<button type="button" class="chip" data-f="__avail">Available now <small>' + items.filter(function (i) { return !i.sold; }).length + "</small></button>" : "") + "</div>" : "";
        return '<section class="sec" id="' + esc(b.anchor || "shop") + '"><div class="wrap">' +
          (b.eyebrow ? '<span class="eyebrow">' + esc(b.eyebrow) + "</span>" : "") + head(b.heading, b.intro) + chips +
          '<div class="pgrid c' + esc(b.columns || "4") + '">' + items.map(function (i, n) {
            var href = url(i.link, "");
            var tagName = href ? "a" : "div";
            return "<" + tagName + ' class="pcard' + (i.sold ? " sold" : "") + '"' + (href ? ' href="' + esc(href) + '"' : "") + ' data-g="' + esc(String(i.group || "").trim()) + '"><div class="pimg">' +
              (img(i.image) ? '<img src="' + esc(img(i.image)) + '" alt="' + esc(i.name) + '" loading="lazy">' : '<div class="ph" style="--h:' + (n * 61 % 360) + '">🛍</div>') +
              (i.tag ? '<span class="ptag">' + esc(i.tag) + "</span>" : "") + (i.sold ? '<span class="stamp">' + esc(sold) + "</span>" : "") + '</div><div class="pbody"><h3>' + esc(i.name) + "</h3>" +
              (i.detail ? "<p>" + esc(i.detail) + "</p>" : "") + '<div class="prow"><b>' + esc(i.price) + "</b>" + (href ? "<span>" + (i.sold ? "See it →" : "Shop →") + "</span>" : "") + "</div></div></" + tagName + ">";
          }).join("") + "</div>" +
          (b.button ? '<div class="center-btn"><a class="btn btn-p btn-lg" href="' + esc(url(b.buttonLink)) + '">' + esc(b.button) + "</a></div>" : "") +
          "</div></section>";
      },
    },
    about: {
      label: "About", icon: "◐", desc: "Your story with a photo",
      fields: [
        { key: "heading", label: "Heading", type: "text" },
        { key: "text", label: "Text", type: "textarea" },
        { key: "points", label: "Highlights (one per line)", type: "textarea" },
        { key: "image", label: "Image (https link)", type: "image" },
        { key: "flip", label: "Image on the left", type: "toggle" },
        { key: "button", label: "Button (optional)", type: "text" },
        { key: "buttonLink", label: "Button link", type: "text" },
      ],
      defaults: function (t) { return { heading: "About " + (t.business || "us"), text: "Tell your story: how you started, what you care about, and why locals trust you.", points: "Locally owned\nFully licensed and insured\nHonest, upfront pricing", image: "", flip: false }; },
      render: function (b) {
        var points = lines(b.points);
        return '<section class="sec alt" id="' + esc(b.anchor || "about") + '"><div class="wrap split' + (b.flip ? " flip" : "") + '"><div><h2>' + esc(b.heading) + "</h2><p class=\"lead\">" + esc(b.text).replace(/\n/g, "<br>") + "</p>" +
          (points.length ? '<ul class="ticks">' + points.map(function (p) { return "<li>" + esc(p) + "</li>"; }).join("") + "</ul>" : "") +
          (b.button ? '<div class="btns"><a class="btn btn-p" href="' + esc(url(b.buttonLink)) + '">' + esc(b.button) + "</a></div>" : "") + "</div>" +
          '<div class="media">' + (img(b.image) ? '<img src="' + esc(img(b.image)) + '" alt="">' : '<div class="ph ph-lg">◐</div>') + "</div></div></section>";
      },
    },
    stats: {
      label: "Stats", icon: "#", desc: "Big numbers that build trust",
      fields: [{ key: "items", label: "Stats", type: "list", item: [{ key: "value", label: "Number", type: "text" }, { key: "label", label: "Label", type: "text" }] }],
      defaults: function () { return { items: [{ value: "15+", label: "Years experience" }, { value: "500+", label: "Happy customers" }, { value: "7 days", label: "A week" }] }; },
      render: function (b) {
        return '<section class="stats"><div class="wrap stats-in">' + (b.items || []).map(function (i) { return '<div><b>' + esc(i.value) + "</b><span>" + esc(i.label) + "</span></div>"; }).join("") + "</div></section>";
      },
    },
    gallery: {
      label: "Gallery", icon: "▣", desc: "Photo grid",
      fields: [
        { key: "heading", label: "Heading", type: "text" },
        { key: "items", label: "Photos", type: "list", item: [{ key: "image", label: "Image (https link)", type: "image" }, { key: "caption", label: "Caption", type: "text" }] },
      ],
      defaults: function () { return { heading: "Our work", items: [{ image: "", caption: "Recent project" }, { image: "", caption: "Recent project" }, { image: "", caption: "Recent project" }, { image: "", caption: "Recent project" }] }; },
      render: function (b) {
        return '<section class="sec" id="gallery"><div class="wrap">' + head(b.heading) + '<div class="gallery">' + (b.items || []).map(function (i, n) {
          return "<figure>" + (img(i.image) ? '<img src="' + esc(img(i.image)) + '" alt="' + esc(i.caption) + '" loading="lazy">' : '<div class="ph" style="--h:' + (n * 47 % 360) + '">▣</div>') + (i.caption ? "<figcaption>" + esc(i.caption) + "</figcaption>" : "") + "</figure>";
        }).join("") + "</div></div></section>";
      },
    },
    testimonials: {
      label: "Reviews", icon: "❝", desc: "Customer testimonials",
      fields: [
        { key: "heading", label: "Heading", type: "text" },
        { key: "items", label: "Reviews", type: "list", item: [{ key: "quote", label: "Review", type: "textarea" }, { key: "name", label: "Name", type: "text" }, { key: "detail", label: "Suburb / detail", type: "text" }] },
      ],
      defaults: function () { return { heading: "What customers say", items: [{ quote: "Paste a real review from Google here.", name: "Customer name", detail: "Warrnambool" }, { quote: "Paste a real review from Google here.", name: "Customer name", detail: "Port Fairy" }, { quote: "Paste a real review from Google here.", name: "Customer name", detail: "Koroit" }] }; },
      render: function (b) {
        return '<section class="sec alt" id="reviews"><div class="wrap">' + head(b.heading) + '<div class="grid3">' + (b.items || []).map(function (i) {
          return '<blockquote class="card quote"><div class="stars">★★★★★</div><p>“' + esc(i.quote) + '”</p><footer><b>' + esc(i.name) + "</b>" + (i.detail ? "<span>" + esc(i.detail) + "</span>" : "") + "</footer></blockquote>";
        }).join("") + "</div></div></section>";
      },
    },
    pricing: {
      label: "Pricing", icon: "$", desc: "Price cards or menu",
      fields: [
        { key: "heading", label: "Heading", type: "text" },
        { key: "intro", label: "Intro", type: "textarea" },
        { key: "items", label: "Prices", type: "list", item: [{ key: "name", label: "Name", type: "text" }, { key: "price", label: "Price", type: "text" }, { key: "note", label: "Note (e.g. per hour)", type: "text" }, { key: "features", label: "Details (one per line)", type: "textarea" }, { key: "featured", label: "Highlight", type: "toggle" }] },
      ],
      defaults: function () { return { heading: "Prices", intro: "", items: [{ name: "Basic", price: "$99", note: "", features: "What's included\nAnother inclusion", featured: false }, { name: "Popular", price: "$199", note: "", features: "What's included\nAnother inclusion", featured: true }, { name: "Premium", price: "$299", note: "", features: "What's included\nAnother inclusion", featured: false }] }; },
      render: function (b) {
        return '<section class="sec" id="pricing"><div class="wrap">' + head(b.heading, b.intro) + '<div class="grid3">' + (b.items || []).map(function (i) {
          var f = lines(i.features);
          return '<div class="card plan' + (i.featured ? " featured" : "") + '"><h3>' + esc(i.name) + '</h3><div class="amount">' + esc(i.price) + (i.note ? "<small>" + esc(i.note) + "</small>" : "") + "</div>" +
            (f.length ? '<ul class="ticks">' + f.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>" : "") + "</div>";
        }).join("") + "</div></div></section>";
      },
    },
    faq: {
      label: "FAQ", icon: "?", desc: "Questions and answers",
      fields: [
        { key: "heading", label: "Heading", type: "text" },
        { key: "intro", label: "Intro (optional)", type: "textarea" },
        { key: "items", label: "Questions", type: "list", item: [{ key: "q", label: "Question", type: "text" }, { key: "a", label: "Answer", type: "textarea" }] },
      ],
      defaults: function () { return { heading: "Questions", items: [{ q: "Do you offer free quotes?", a: "Yes. Get in touch and we'll get back to you the same day." }, { q: "What areas do you cover?", a: "Warrnambool and surrounding towns." }] }; },
      render: function (b) {
        return '<section class="sec alt" id="' + esc(b.anchor || "faq") + '"><div class="wrap narrow">' + head(b.heading, b.intro) + (b.items || []).map(function (i) {
          return '<details class="faq"><summary>' + esc(i.q) + "</summary><p>" + esc(i.a) + "</p></details>";
        }).join("") + "</div></section>";
      },
    },
    hours: {
      label: "Hours & location", icon: "⌚", desc: "Opening hours and directions",
      fields: [
        { key: "heading", label: "Heading", type: "text" },
        { key: "rows", label: "Opening hours", type: "list", item: [{ key: "day", label: "Day(s)", type: "text" }, { key: "time", label: "Hours", type: "text" }] },
        { key: "address", label: "Address", type: "textarea" },
        { key: "mapQuery", label: "Google Maps search", type: "text", hint: "e.g. business name and town" },
      ],
      defaults: function (t) { return { heading: "Visit us", rows: [{ day: "Mon – Fri", time: "8am – 5pm" }, { day: "Saturday", time: "9am – 1pm" }, { day: "Sunday", time: "Closed" }], address: "1 Example Street\nWarrnambool VIC 3280", mapQuery: (t.business || "") + " Warrnambool" }; },
      render: function (b) {
        var maps = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(b.mapQuery || b.address || "");
        return '<section class="sec" id="hours"><div class="wrap split"><div><h2>' + esc(b.heading) + '</h2><table class="hours">' + (b.rows || []).map(function (r) { return "<tr><td>" + esc(r.day) + "</td><td>" + esc(r.time) + "</td></tr>"; }).join("") + "</table></div>" +
          '<div class="card map"><div class="pin">📍</div><p>' + esc(b.address).replace(/\n/g, "<br>") + '</p><a class="btn btn-p" href="' + esc(maps) + '" target="_blank" rel="noopener">Get directions</a></div></div></section>';
      },
    },
    cta: {
      label: "Call to action", icon: "➜", desc: "Bold banner with a button",
      fields: [
        { key: "heading", label: "Heading", type: "text" },
        { key: "text", label: "Text", type: "textarea" },
        { key: "button", label: "Button", type: "text" },
        { key: "buttonLink", label: "Button link", type: "text" },
      ],
      defaults: function (t) { return { heading: "Ready when you are", text: "Get in touch today for a free, no-obligation quote.", button: t.phone ? "Call " + t.phone : "Contact us", buttonLink: "" }; },
      render: function (b, t) {
        return '<section class="cta"' + (b.anchor ? ' id="' + esc(b.anchor) + '"' : "") + '><div class="wrap"><h2>' + esc(b.heading) + "</h2>" + (b.text ? "<p>" + esc(b.text) + "</p>" : "") + (b.button ? '<a class="btn btn-inv btn-lg" href="' + esc(url(b.buttonLink, telLink(t.phone))) + '">' + esc(b.button) + "</a>" : "") + "</div></section>";
      },
    },
    contact: {
      label: "Contact", icon: "✉", desc: "Contact details and enquiry form",
      fields: [
        { key: "heading", label: "Heading", type: "text" },
        { key: "text", label: "Text", type: "textarea" },
        { key: "showForm", label: "Show enquiry form", type: "toggle" },
      ],
      defaults: function () { return { heading: "Get in touch", text: "Call, email or send us a message and we'll get back to you within one business day.", showForm: true }; },
      render: function (b, t) {
        var details = (t.phone ? '<a class="contact-line" href="' + esc(telLink(t.phone)) + '">📞 ' + esc(t.phone) + "</a>" : "") + (t.email ? '<a class="contact-line" href="mailto:' + esc(t.email) + '">✉️ ' + esc(t.email) + "</a>" : "");
        var form = b.showForm ? '<form class="card form" action="mailto:' + esc(t.email || "") + '" method="post" enctype="text/plain"><label>Name<input name="name" required></label><label>Phone<input name="phone" type="tel"></label><label>How can we help?<textarea name="message" rows="4"></textarea></label><button class="btn btn-p" type="submit">Send enquiry</button></form>' : "";
        return '<section class="sec alt" id="contact"><div class="wrap split"><div><h2>' + esc(b.heading) + '</h2><p class="lead">' + esc(b.text) + "</p>" + details + "</div>" + form + "</div></section>";
      },
    },
    pagehead: {
      label: "Page header", icon: "▔", desc: "Title banner for the top of a page",
      fields: [
        { key: "eyebrow", label: "Small text above", type: "text" },
        { key: "heading", label: "Page title", type: "textarea" },
        { key: "text", label: "Intro", type: "textarea" },
        { key: "image", label: "Background photo (optional)", type: "image" },
      ],
      defaults: function () { return { eyebrow: "", heading: "Page title", text: "A sentence or two about what's on this page.", image: "" }; },
      render: function (b) {
        var bg = img(b.image);
        return '<section class="phead' + (bg ? " has-img" : "") + '"' + (bg ? ' style="--bgimg:url(\'' + esc(bg) + '\')"' : "") + '><div class="wrap">' +
          (b.eyebrow ? '<span class="eyebrow">' + esc(b.eyebrow) + "</span>" : "") + "<h1>" + esc(b.heading).replace(/\n/g, "<br>") + "</h1>" +
          (b.text ? '<p class="lead">' + esc(b.text) + "</p>" : "") + "</div></section>";
      },
    },
    tiles: {
      label: "Collection tiles", icon: "▤", desc: "Big photo tiles that link to pages",
      fields: [
        { key: "eyebrow", label: "Small text above", type: "text" },
        { key: "heading", label: "Heading", type: "text" },
        { key: "intro", label: "Intro", type: "textarea" },
        { key: "items", label: "Tiles", type: "list", item: [{ key: "image", label: "Photo (https link)", type: "image" }, { key: "title", label: "Title", type: "text" }, { key: "text", label: "Short text", type: "text" }, { key: "link", label: "Link (e.g. #/shop)", type: "text" }] },
      ],
      defaults: function () { return { eyebrow: "", heading: "Shop by collection", intro: "", items: [{ image: "", title: "Collection one", text: "", link: "" }, { image: "", title: "Collection two", text: "", link: "" }, { image: "", title: "Collection three", text: "", link: "" }] }; },
      render: function (b) {
        var items = b.items || [];
        return '<section class="sec" id="' + esc(b.anchor || "collections") + '"><div class="wrap">' + (b.eyebrow ? '<span class="eyebrow">' + esc(b.eyebrow) + "</span>" : "") + head(b.heading, b.intro) +
          '<div class="tiles n' + Math.min(items.length, 5) + '">' + items.map(function (i, n) {
            var href = url(i.link, "");
            var tag = href ? "a" : "div";
            return "<" + tag + ' class="tile"' + (href ? ' href="' + esc(href) + '"' : "") + ">" + (img(i.image) ? '<img src="' + esc(img(i.image)) + '" alt="" loading="lazy">' : '<div class="ph" style="--h:' + (n * 73 % 360) + '"></div>') +
              '<div class="tile-copy"><h3>' + esc(i.title) + "</h3>" + (i.text ? "<p>" + esc(i.text) + "</p>" : "") + (href ? '<span class="tile-go" aria-hidden="true">→</span>' : "") + "</div></" + tag + ">";
          }).join("") + "</div></div></section>";
      },
    },
    feature: {
      label: "Feature", icon: "◆", desc: "Spotlight one product or offer",
      fields: [
        { key: "eyebrow", label: "Small text above", type: "text" },
        { key: "heading", label: "Heading", type: "textarea" },
        { key: "text", label: "Text", type: "textarea" },
        { key: "points", label: "Highlights (one per line)", type: "textarea" },
        { key: "price", label: "Price (optional)", type: "text" },
        { key: "priceNote", label: "Price note", type: "text" },
        { key: "button", label: "Main button", type: "text" },
        { key: "buttonLink", label: "Main button link", type: "text" },
        { key: "button2", label: "Second button", type: "text" },
        { key: "button2Link", label: "Second button link", type: "text" },
        { key: "image", label: "Image (https link)", type: "image" },
        { key: "badge", label: "Sticker on the image", type: "text" },
        { key: "flip", label: "Image on the left", type: "toggle" },
      ],
      defaults: function () { return { eyebrow: "Featured", heading: "Your best seller", text: "Why people love it, in a sentence or two.", points: "First great thing\nSecond great thing", price: "$49", priceNote: "", button: "Buy now", buttonLink: "", button2: "", button2Link: "", image: "", badge: "New", flip: false }; },
      render: function (b) {
        var points = lines(b.points);
        return '<section class="sec feat-sec" id="' + esc(b.anchor || "feature") + '"><div class="wrap split feat' + (b.flip ? " flip" : "") + '"><div>' +
          (b.eyebrow ? '<span class="eyebrow">' + esc(b.eyebrow) + "</span>" : "") + "<h2>" + esc(b.heading).replace(/\n/g, "<br>") + "</h2>" + (b.text ? '<p class="lead">' + esc(b.text).replace(/\n/g, "<br>") + "</p>" : "") +
          (points.length ? '<ul class="ticks">' + points.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>" : "") +
          (b.price ? '<div class="feat-price"><b>' + esc(b.price) + "</b>" + (b.priceNote ? "<span>" + esc(b.priceNote) + "</span>" : "") + "</div>" : "") +
          '<div class="btns">' + (b.button ? '<a class="btn btn-p btn-lg" href="' + esc(url(b.buttonLink)) + '">' + esc(b.button) + "</a>" : "") + (b.button2 ? '<a class="btn btn-o btn-lg" href="' + esc(url(b.button2Link)) + '">' + esc(b.button2) + "</a>" : "") + "</div></div>" +
          '<div class="media feat-media">' + (img(b.image) ? '<img src="' + esc(img(b.image)) + '" alt="" loading="lazy">' : '<div class="ph ph-lg">◆</div>') + (b.badge ? '<span class="feat-badge">' + esc(b.badge) + "</span>" : "") + "</div></div></section>";
      },
    },
    steps: {
      label: "Steps", icon: "①", desc: "Numbered steps or reasons",
      fields: [
        { key: "eyebrow", label: "Small text above", type: "text" },
        { key: "heading", label: "Heading", type: "text" },
        { key: "intro", label: "Intro", type: "textarea" },
        { key: "items", label: "Steps", type: "list", item: [{ key: "title", label: "Title", type: "text" }, { key: "text", label: "Text", type: "textarea" }] },
      ],
      defaults: function () { return { eyebrow: "", heading: "How it works", intro: "", items: [{ title: "Get in touch", text: "Call or send a message." }, { title: "We get to work", text: "Fast, tidy and on budget." }, { title: "Job done", text: "Pay when you're happy." }] }; },
      render: function (b) {
        return '<section class="sec" id="' + esc(b.anchor || "steps") + '"><div class="wrap">' + (b.eyebrow ? '<span class="eyebrow">' + esc(b.eyebrow) + "</span>" : "") + head(b.heading, b.intro) +
          '<ol class="steps">' + (b.items || []).map(function (i, n) {
            return '<li class="card"><span class="num">' + (n < 9 ? "0" : "") + (n + 1) + "</span><h3>" + esc(i.title) + "</h3><p>" + esc(i.text) + "</p></li>";
          }).join("") + "</ol></div></section>";
      },
    },
    text: {
      label: "Text", icon: "¶", desc: "Paragraphs, lists and simple tables",
      fields: [
        { key: "heading", label: "Heading", type: "text" },
        { key: "body", label: "Text", type: "textarea", hint: "Blank line = new paragraph. Start a line with \"## \" for a subheading, \"- \" for a bullet. \"Left | Right\" makes a table row." },
        { key: "alt", label: "Shaded background", type: "toggle" },
      ],
      defaults: function () { return { heading: "Heading", body: "Write anything here.\n\n## A subheading\n- A bullet point\n- Another one\n\nStandard delivery | $10\nPick up | Free", alt: false }; },
      render: function (b) {
        return '<section class="sec' + (b.alt ? " alt" : "") + '" id="' + esc(b.anchor || "info") + '"><div class="wrap narrow prose">' + (b.heading ? "<h2>" + esc(b.heading) + "</h2>" : "") + prose(b.body) + "</div></section>";
      },
    },
    signup: {
      label: "Sign-up", icon: "✎", desc: "Email list sign-up (opens their email app)",
      fields: [
        { key: "eyebrow", label: "Small text above", type: "text" },
        { key: "heading", label: "Heading", type: "text" },
        { key: "text", label: "Text", type: "textarea" },
        { key: "button", label: "Button", type: "text" },
        { key: "note", label: "Small print", type: "text" },
      ],
      defaults: function () { return { eyebrow: "", heading: "Be first to know", text: "One email when something new drops. Nothing else.", button: "Join the list", note: "Unsubscribe any time." }; },
      render: function (b, t) {
        return '<section class="signup" id="' + esc(b.anchor || "signup") + '"><div class="wrap narrow">' + (b.eyebrow ? '<span class="eyebrow">' + esc(b.eyebrow) + "</span>" : "") + "<h2>" + esc(b.heading) + "</h2>" + (b.text ? '<p class="lead">' + esc(b.text) + "</p>" : "") +
          '<form class="signup-form" action="mailto:' + esc(t.email || "") + "?subject=" + encodeURIComponent("Add me to the list") + '" method="post" enctype="text/plain"><input type="email" name="email" placeholder="you@email.com" aria-label="Email address" required><button class="btn btn-p" type="submit">' + esc(b.button || "Join") + "</button></form>" +
          (b.note ? '<p class="small">' + esc(b.note) + "</p>" : "") + "</div></section>";
      },
    },
    footer: {
      label: "Footer", icon: "▁", desc: "Copyright and contact line",
      fields: [
        { key: "text", label: "Footer text", type: "textarea" },
        { key: "tagline", label: "Short blurb (optional)", type: "textarea", hint: "Adds a bigger footer with your name, this blurb and links." },
        { key: "links", label: "Extra links", type: "list", item: [{ key: "text", label: "Text", type: "text" }, { key: "link", label: "Link", type: "text" }] },
      ],
      defaults: function (t) { return { text: "© " + new Date().getFullYear() + " " + (t.business || "Your Business") + ". All rights reserved." }; },
      render: function (b, t, ctx) {
        var pageLinks = ctx.multi ? ctx.pages.map(function (p) { return '<a href="#/' + esc(p.slug) + '">' + esc(p.title) + "</a>"; }).join("") : "";
        var extra = (b.links || []).map(function (l) { return '<a href="' + esc(url(l.link)) + '"' + (/^https?:/i.test(url(l.link)) ? ' target="_blank" rel="noopener"' : "") + ">" + esc(l.text) + "</a>"; }).join("");
        var big = b.tagline || pageLinks || extra;
        return '<footer class="ftr' + (big ? " ftr-big" : "") + '"><div class="wrap">' +
          (big ? '<div class="ftr-top"><div><a class="logo" href="' + (ctx.multi ? "#/" + esc(ctx.pages[0].slug) : "#top") + '">' + esc(t.business || "") + "</a>" + (b.tagline ? "<p>" + esc(b.tagline) + "</p>" : "") +
            (t.email ? '<p><a href="mailto:' + esc(t.email) + '">' + esc(t.email) + "</a></p>" : "") + "</div>" +
            (pageLinks ? '<nav class="ftr-col"><b>Explore</b>' + pageLinks + "</nav>" : "") + (extra ? '<nav class="ftr-col"><b>More</b>' + extra + "</nav>" : "") + "</div>" : "") +
          '<div class="ftr-in"><span>' + esc(b.text) + '</span><span class="credit">Website by Marshall Web Co.</span></div></div></footer>';
      },
    },
  };

  // Simple text formatting for the Text section
  function prose(src) {
    var out = [], list = null, table = null, para = [];
    function flush() {
      if (para.length) { out.push("<p>" + para.map(esc).join("<br>") + "</p>"); para = []; }
      if (list) { out.push("<ul>" + list.join("") + "</ul>"); list = null; }
      if (table) { out.push('<table class="kv">' + table.join("") + "</table>"); table = null; }
    }
    String(src || "").split("\n").forEach(function (raw) {
      var l = raw.trim();
      if (!l) return flush();
      if (/^##\s+/.test(l)) { flush(); out.push("<h3>" + esc(l.replace(/^##\s+/, "")) + "</h3>"); return; }
      if (/^[-•]\s+/.test(l)) { if (para.length || table) flush(); list = list || []; list.push("<li>" + esc(l.replace(/^[-•]\s+/, "")) + "</li>"); return; }
      if (l.indexOf(" | ") > 0) { if (para.length || list) flush(); table = table || []; var c = l.split(" | "); table.push("<tr><td>" + esc(c[0]) + "</td><td>" + esc(c.slice(1).join(" | ")) + "</td></tr>"); return; }
      if (list || table) flush();
      para.push(l);
    });
    flush();
    return out.join("");
  }

  function menuPages(ctx) { return ctx.pages.filter(function (p, i) { return i > 0 && !p.hideInMenu; }); }

  function head(h, intro) {
    return '<div class="sec-head">' + (h ? "<h2>" + esc(h) + "</h2>" : "") + (intro ? '<p class="lead">' + esc(intro) + "</p>" : "") + "</div>";
  }

  // ---------- Theme ----------
  function themeCss(t) {
    var dark = t.mode === "dark";
    var p = color(t.primary, "#2e9e5b"), a = color(t.accent, "#14213d");
    var f = FONTS[t.font] || FONTS.modern;
    return ":root{--p:" + p + ";--a:" + a + ";--bg:" + (dark ? "#0d1017" : "#ffffff") + ";--bg2:" + (dark ? "#141925" : "#f6f5f1") + ";--fg:" + (dark ? "#f1f3f7" : "#1b1f2a") +
      ";--muted:" + (dark ? "#a3abbd" : "#5b6170") + ";--card:" + (dark ? "#171d2b" : "#ffffff") + ";--line:" + (dark ? "rgba(255,255,255,.1)" : "rgba(0,0,0,.08)") +
      ";--r:" + (RADIUS[t.radius] || RADIUS.soft) + ";--fh:'" + f.head + "',system-ui,sans-serif;--fb:'" + f.body + "',system-ui,sans-serif}";
  }

  var BASE_CSS = [
    "*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--bg);color:var(--fg);font-family:var(--fb);font-size:17px;line-height:1.6;-webkit-font-smoothing:antialiased;overflow-x:hidden}",
    "img{max-width:100%;display:block}a{color:inherit}h1,h2,h3{font-family:var(--fh);line-height:1.08;letter-spacing:-.02em;margin:0 0 .5em}h1{font-size:clamp(2.3rem,6vw,4.2rem)}h2{font-size:clamp(1.8rem,4vw,2.8rem)}h3{font-size:1.2rem}",
    ".wrap{max-width:1140px;margin:0 auto;padding:0 22px}.narrow{max-width:780px}.lead{font-size:1.15rem;color:var(--muted)}.eyebrow{display:inline-block;font-size:.8rem;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--p);margin-bottom:14px}",
    ".btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:13px 22px;border-radius:var(--r);font-weight:700;text-decoration:none;border:2px solid transparent;transition:transform .15s;font-family:var(--fb);font-size:1rem;cursor:pointer}.btn:hover{transform:translateY(-2px)}.btn-lg{padding:16px 28px;font-size:1.05rem}",
    ".btn-p{background:var(--p);color:#fff}.btn-o{border-color:currentColor;color:var(--fg)}.btn-inv{background:#fff;color:var(--a)}",
    ".hdr{position:sticky;top:0;z-index:10;background:color-mix(in srgb,var(--bg) 88%,transparent);backdrop-filter:blur(10px);border-bottom:1px solid var(--line)}.hdr-in{display:flex;align-items:center;justify-content:space-between;gap:16px;min-height:70px}",
    "[hidden]{display:none!important}.logo{font-family:var(--fh);font-weight:800;font-size:1.25rem;text-decoration:none}.menu{display:flex;gap:22px}.menu a{position:relative;text-decoration:none;font-weight:600;color:var(--muted);transition:color .2s}.menu a:hover,.menu a.on{color:var(--fg)}.menu a.on::after{content:'';position:absolute;left:0;right:0;bottom:-6px;height:2px;border-radius:2px;background:var(--p)}",
    ".hdr-end{display:flex;align-items:center;gap:10px}.nav-t{position:absolute;opacity:0;pointer-events:none}.burger,.drawer{display:none}",
    "@media(max-width:860px){.menu{display:none}.hdr .btn{padding:10px 14px;font-size:.9rem}.burger{display:grid;gap:5px;place-content:center;width:44px;height:44px;border:1px solid var(--line);border-radius:var(--r);cursor:pointer}.burger i{display:block;width:20px;height:2px;border-radius:2px;background:currentColor;transition:transform .25s,opacity .25s}",
    ".nav-t:checked~.burger i:nth-child(1){transform:translateY(7px) rotate(45deg)}.nav-t:checked~.burger i:nth-child(2){opacity:0}.nav-t:checked~.burger i:nth-child(3){transform:translateY(-7px) rotate(-45deg)}.nav-t:focus-visible~.burger{outline:2px solid var(--p)}",
    ".nav-t:checked~.drawer{display:flex;flex-direction:column;position:absolute;left:0;right:0;top:100%;padding:8px 22px 24px;background:var(--bg);border-bottom:1px solid var(--line);box-shadow:0 30px 60px rgba(0,0,0,.35);animation:dr .25s ease-out}.drawer a{padding:14px 0;font-family:var(--fh);font-size:1.25rem;font-weight:700;text-decoration:none;border-bottom:1px solid var(--line)}.drawer a.on{color:var(--p)}.drawer .btn{margin-top:18px;border:0;font-size:1rem}@keyframes dr{from{opacity:0;transform:translateY(-8px)}}}",
    "@media(max-width:420px){.hdr-cta{display:none}}",
    ".hero{padding:96px 0;background:radial-gradient(900px 420px at 85% 0%,color-mix(in srgb,var(--p) 22%,transparent),transparent 70%),linear-gradient(180deg,var(--bg2),var(--bg))}.hero-center{text-align:center}.hero-center .lead{max-width:640px;margin:0 auto}.hero-center .btns,.hero-center .badges{justify-content:center}",
    ".hero-split .hero-in{display:grid;grid-template-columns:1.1fr .9fr;gap:48px;align-items:center}@media(max-width:860px){.hero-split .hero-in{grid-template-columns:1fr}}.hero-media img,.media img{border-radius:var(--r);width:100%;aspect-ratio:4/3;object-fit:cover}",
    ".btns{display:flex;flex-wrap:wrap;gap:12px;margin-top:28px}.badges{display:flex;flex-wrap:wrap;gap:8px 18px;list-style:none;padding:0;margin:26px 0 0;color:var(--muted);font-weight:600;font-size:.95rem}.badges li::before{content:'✓ ';color:var(--p)}",
    ".sec{padding:88px 0}.alt{background:var(--bg2)}.sec-head{max-width:680px;margin-bottom:40px}.grid3{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:18px}",
    ".card{background:var(--card);border:1px solid var(--line);border-radius:var(--r);padding:28px;box-shadow:0 10px 30px rgba(0,0,0,.05)}.card p{color:var(--muted);margin:0}.ic{font-size:1.8rem;margin-bottom:12px}.price-tag{margin-top:16px;font-weight:800;color:var(--p)}",
    ".split{display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:center}.split.flip>:first-child{order:2}@media(max-width:860px){.split{grid-template-columns:1fr}.split.flip>:first-child{order:0}}",
    ".ticks{list-style:none;padding:0;margin:18px 0 0}.ticks li{padding:6px 0 6px 28px;position:relative}.ticks li::before{content:'✓';position:absolute;left:0;color:var(--p);font-weight:900}",
    ".ph{aspect-ratio:4/3;border-radius:var(--r);display:grid;place-items:center;font-size:2.4rem;color:rgba(255,255,255,.7);background:linear-gradient(135deg,hsl(var(--h,220) 45% 45%),color-mix(in srgb,var(--p) 70%,#000))}.ph-lg{font-size:3.4rem}",
    ".stats{background:var(--a);color:#fff;padding:54px 0}.stats-in{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:24px;text-align:center}.stats b{display:block;font-family:var(--fh);font-size:2.6rem;color:var(--p);line-height:1.1}.stats span{opacity:.85}",
    ".gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px}.gallery figure{margin:0}.gallery img{border-radius:var(--r);aspect-ratio:4/3;object-fit:cover;width:100%}figcaption{font-size:.9rem;color:var(--muted);margin-top:8px}",
    ".quote{margin:0}.quote p{color:var(--fg);font-size:1.05rem;margin:10px 0 18px}.stars{color:#f5b301;letter-spacing:2px}.quote footer b{display:block}.quote footer span{color:var(--muted);font-size:.9rem}",
    ".plan{display:flex;flex-direction:column}.plan.featured{border:2px solid var(--p);transform:translateY(-6px)}.amount{font-family:var(--fh);font-size:2.4rem;font-weight:800;margin:6px 0}.amount small{font-size:.95rem;font-weight:500;color:var(--muted);margin-left:6px}",
    ".faq{border-bottom:1px solid var(--line)}.faq summary{cursor:pointer;padding:20px 0;font-weight:700;font-size:1.08rem;list-style:none}.faq summary::-webkit-details-marker{display:none}.faq summary::after{content:'+';float:right;color:var(--p);font-size:1.4rem;line-height:1}.faq[open] summary::after{content:'–'}.faq p{margin:0 0 20px;color:var(--muted)}",
    ".hours{width:100%;border-collapse:collapse}.hours td{padding:12px 0;border-bottom:1px solid var(--line)}.hours td:last-child{text-align:right;font-weight:600}.map{text-align:center}.map .pin{font-size:2.6rem}.map p{margin:10px 0 20px}",
    ".cta{background:linear-gradient(120deg,var(--a),color-mix(in srgb,var(--a) 60%,var(--p)));color:#fff;text-align:center;padding:84px 0}.cta h2{color:#fff}.cta p{opacity:.9;font-size:1.15rem;max-width:620px;margin:0 auto 26px}",
    ".contact-line{display:block;font-size:1.15rem;font-weight:700;text-decoration:none;margin-top:14px}.form{display:grid;gap:14px}.form label{display:grid;gap:6px;font-weight:600;font-size:.92rem}.form input,.form textarea{font:inherit;padding:12px 14px;border-radius:calc(var(--r)*.6);border:1px solid var(--line);background:var(--bg);color:var(--fg)}",
    ".mq{overflow:hidden;padding:16px 0;font-family:var(--fh);font-weight:800;text-transform:uppercase;letter-spacing:.06em;white-space:nowrap}.mq-brand{background:var(--p);color:#fff}.mq-dark{background:var(--a);color:#fff}.mq-outline{border-top:1px solid var(--line);border-bottom:1px solid var(--line);color:var(--p)}",
    ".mq-track{display:inline-flex;gap:46px;animation:mq 30s linear infinite}.mq-track span::after{content:'✦';margin-left:46px;opacity:.6}@keyframes mq{to{transform:translateX(-50%)}}@media(prefers-reduced-motion:reduce){.mq-track{animation:none}}",
    ".pgrid{display:grid;gap:18px}.pgrid.c4{grid-template-columns:repeat(4,1fr)}.pgrid.c3{grid-template-columns:repeat(3,1fr)}.pgrid.c2{grid-template-columns:repeat(2,1fr)}@media(max-width:960px){.pgrid.c4,.pgrid.c3{grid-template-columns:repeat(2,1fr)}}@media(max-width:520px){.pgrid{gap:12px}.pgrid.c2{grid-template-columns:1fr}}",
    ".pcard{display:flex;flex-direction:column;background:var(--card);border:1px solid var(--line);border-radius:var(--r);overflow:hidden;text-decoration:none;color:inherit;transition:transform .25s,box-shadow .25s,border-color .25s}a.pcard:hover{transform:translateY(-4px);border-color:var(--p);box-shadow:0 18px 40px color-mix(in srgb,var(--p) 25%,transparent)}",
    ".pimg{position:relative;aspect-ratio:1;overflow:hidden;background:var(--bg2)}.pimg img{width:100%;height:100%;object-fit:cover;transition:transform .5s}a.pcard:hover .pimg img{transform:scale(1.05)}.pimg .ph{aspect-ratio:1;border-radius:0}",
    ".ptag{position:absolute;top:12px;left:12px;background:var(--p);color:#fff;font-size:.72rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase;padding:5px 10px;border-radius:99px}",
    ".pbody{padding:16px 18px 18px;display:flex;flex-direction:column;gap:6px;flex:1}.pbody h3{font-size:1.02rem;margin:0}.pbody p{margin:0;color:var(--muted);font-size:.9rem}.prow{margin-top:auto;padding-top:8px;display:flex;justify-content:space-between;align-items:center}.prow b{font-size:1.1rem}.prow span{color:var(--p);font-weight:700;font-size:.9rem}",
    ".center-btn{text-align:center;margin-top:32px}@media(max-width:520px){.pbody{padding:12px}.pbody h3{font-size:.92rem}}",
    ".ftr{padding:30px 0;border-top:1px solid var(--line);color:var(--muted);font-size:.9rem}.ftr-in{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}.credit{opacity:.7}",
    ".ftr-big{padding-top:64px}.ftr-top{display:grid;grid-template-columns:2fr 1fr 1fr;gap:32px;padding-bottom:36px;margin-bottom:24px;border-bottom:1px solid var(--line)}.ftr-top p{max-width:380px;margin:12px 0 0}.ftr-top a{text-decoration:none}.ftr-top .logo{color:var(--fg);font-size:1.6rem}.ftr-col{display:flex;flex-direction:column;gap:9px}.ftr-col b{color:var(--fg);font-family:var(--fh);margin-bottom:4px}.ftr-col a:hover{color:var(--p)}@media(max-width:700px){.ftr-top{grid-template-columns:1fr 1fr}.ftr-top>:first-child{grid-column:1/-1}}",
    // Full-screen hero, page header, tiles, feature, steps, text, sign-up
    ".hero-full{position:relative;min-height:min(92vh,880px);display:flex;align-items:flex-end;padding:130px 0 90px;color:#fff;background:linear-gradient(180deg,rgba(0,0,0,.2),rgba(0,0,0,.3) 45%,color-mix(in srgb,var(--bg) 94%,transparent)),var(--bgimg,linear-gradient(135deg,var(--a),var(--p))) center/cover no-repeat}",
    ".hero-full .hero-in{width:100%}.hero-full h1{font-size:clamp(2.8rem,9vw,7rem);line-height:.98;text-shadow:0 6px 40px rgba(0,0,0,.35)}.hero-full .lead{color:rgba(255,255,255,.86);max-width:620px}.hero-full .btn-o{color:#fff}.hero-full .badges{color:rgba(255,255,255,.8)}",
    ".scroll-cue{position:absolute;left:50%;bottom:22px;width:2px;height:44px;background:linear-gradient(rgba(255,255,255,.9),transparent);animation:cue 1.8s ease-in-out infinite}@keyframes cue{0%{transform:scaleY(0);transform-origin:top}50%{transform:scaleY(1);transform-origin:top}51%{transform-origin:bottom}100%{transform:scaleY(0);transform-origin:bottom}}",
    ".phead{padding:84px 0 56px;background:radial-gradient(760px 320px at 12% 0%,color-mix(in srgb,var(--p) 26%,transparent),transparent 70%),var(--bg2);border-bottom:1px solid var(--line)}.phead h1{font-size:clamp(2.4rem,7vw,5rem);margin:0 0 .3em}.phead .lead{max-width:680px;margin:0}",
    ".phead.has-img{padding:130px 0 70px;color:#fff;background:linear-gradient(90deg,rgba(0,0,0,.78),rgba(0,0,0,.35)),var(--bgimg) center/cover no-repeat}.phead.has-img .lead{color:rgba(255,255,255,.86)}",
    ".tiles{display:grid;gap:16px;grid-template-columns:repeat(6,1fr)}.tile{grid-column:span 2;position:relative;display:block;aspect-ratio:4/5;border-radius:var(--r);overflow:hidden;text-decoration:none;color:#fff;background:var(--bg2);isolation:isolate}",
    ".tiles.n5 .tile:nth-child(-n+2),.tiles.n4 .tile,.tiles.n2 .tile{grid-column:span 3;aspect-ratio:16/11}.tiles.n1 .tile{grid-column:span 6;aspect-ratio:21/9}",
    ".tile img,.tile .ph{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;aspect-ratio:auto;border-radius:0;transition:transform .7s cubic-bezier(.2,.7,.2,1);z-index:-1}.tile::after{content:'';position:absolute;inset:0;z-index:-1;background:linear-gradient(180deg,transparent 35%,rgba(0,0,0,.82))}",
    ".tile-copy{position:absolute;left:0;right:0;bottom:0;padding:24px 76px 24px 24px}.tile h3{font-size:clamp(1.3rem,2.4vw,1.8rem);margin:0}.tile p{margin:6px 0 0;opacity:.86;font-size:.95rem}",
    ".tile-go{position:absolute;right:20px;bottom:24px;width:44px;height:44px;border-radius:50%;background:var(--p);display:grid;place-items:center;font-weight:800;transition:transform .3s}a.tile:hover img{transform:scale(1.07)}a.tile:hover .tile-go{transform:translateX(4px)}",
    "@media(max-width:860px){.tiles{grid-template-columns:1fr 1fr;gap:12px}.tiles .tile.tile.tile{grid-column:span 1;aspect-ratio:4/5}.tiles.n5 .tile.tile.tile:first-child,.tiles.n3 .tile.tile.tile:first-child,.tiles.n1 .tile.tile.tile{grid-column:span 2;aspect-ratio:16/11}.tile-copy{padding:14px 14px 58px}.tile h3{font-size:1.1rem}.tile p{font-size:.82rem}.tile-go{right:auto;left:14px;bottom:14px;width:34px;height:34px}}",
    "@media(max-width:700px){.hero-full{min-height:88vh;padding:110px 0 70px;background:linear-gradient(180deg,rgba(0,0,0,.35),rgba(0,0,0,.55) 40%,color-mix(in srgb,var(--bg) 96%,transparent)),var(--bgimg,linear-gradient(135deg,var(--a),var(--p))) center/cover no-repeat}.hero-full .btns .btn{flex:1 1 100%}}",
    ".feat-media{position:relative}.feat-media img{aspect-ratio:1;object-fit:cover}.feat-badge{position:absolute;top:18px;right:18px;background:var(--p);color:#fff;font-family:var(--fh);font-weight:800;padding:10px 16px;border-radius:99px;transform:rotate(6deg);box-shadow:0 12px 30px rgba(0,0,0,.3)}",
    ".feat-price{display:flex;align-items:baseline;gap:10px;margin-top:24px}.feat-price b{font-family:var(--fh);font-size:2.4rem;color:var(--p);line-height:1}.feat-price span{color:var(--muted)}",
    ".steps{list-style:none;padding:0;margin:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:18px}.steps .num{display:block;font-family:var(--fh);font-size:2.6rem;line-height:1;color:var(--p);margin-bottom:16px}",
    ".prose h3{margin:1.6em 0 .5em}.prose p,.prose li{color:var(--muted)}.prose ul{padding-left:1.2em}.kv{width:100%;border-collapse:collapse;margin:10px 0 18px}.kv td{padding:13px 0;border-bottom:1px solid var(--line)}.kv td:last-child{text-align:right;font-weight:700}",
    ".signup{padding:88px 0;text-align:center;background:radial-gradient(620px 280px at 50% 0%,color-mix(in srgb,var(--p) 26%,transparent),transparent 70%),var(--bg2)}.signup .lead{margin:0 auto}.signup-form{display:flex;gap:10px;max-width:520px;margin:28px auto 0}",
    ".signup-form input{flex:1;min-width:0;font:inherit;padding:14px 16px;border-radius:var(--r);border:1px solid var(--line);background:var(--bg);color:var(--fg)}.small{font-size:.85rem;color:var(--muted);margin-top:14px}@media(max-width:520px){.signup-form{flex-direction:column}}",
    // Product filters and sold state
    ".chips{display:flex;flex-wrap:wrap;gap:8px;margin:-14px 0 28px}html:not(.js) .chips{display:none}.chip{font:inherit;font-weight:700;font-size:.9rem;padding:9px 16px;border-radius:99px;border:1px solid var(--line);background:var(--card);color:var(--fg);cursor:pointer;transition:background .2s,border-color .2s}.chip:hover{border-color:var(--p)}.chip small{opacity:.6;margin-left:3px}.chip.on{background:var(--p);border-color:var(--p);color:#fff}",
    ".pcard.sold .pimg img{filter:grayscale(1) brightness(.5)}.pcard.sold .prow b{text-decoration:line-through;opacity:.55}.pcard.sold .ptag{background:#4a4a52}",
    ".stamp{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-12deg);border:3px solid #fff;color:#fff;font-family:var(--fh);font-weight:800;font-size:1.15rem;letter-spacing:.12em;text-transform:uppercase;padding:6px 16px;border-radius:8px;background:rgba(0,0,0,.25);white-space:nowrap}",
    // Pages and scroll-in animation
    "main.page{animation:pg .45s ease-out}@keyframes pg{from{opacity:0}}",
    ".anim .rv{opacity:0;translate:0 22px;transition:opacity .8s cubic-bezier(.2,.7,.2,1),translate .8s cubic-bezier(.2,.7,.2,1)}.anim .rv.in{opacity:1;translate:none}.anim .pgrid>.rv:nth-child(4n+2),.anim .tiles>.rv:nth-child(3n+2),.anim .grid3>.rv:nth-child(3n+2),.anim .steps>.rv:nth-child(3n+2){transition-delay:.08s}.anim .pgrid>.rv:nth-child(4n+3),.anim .tiles>.rv:nth-child(3n),.anim .grid3>.rv:nth-child(3n),.anim .steps>.rv:nth-child(3n){transition-delay:.16s}.anim .pgrid>.rv:nth-child(4n){transition-delay:.24s}",
    "@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important}html{scroll-behavior:auto}}",
  ].join("");

  // Runs on published pages: page switching, anchor links, the mobile menu, product filters and scroll-in animation
  var SITE_JS = "(function(){var d=document,h=d.documentElement,base=d.title;h.classList.add('js');" +
    "var pages=[].slice.call(d.querySelectorAll('main[data-page]'));" +
    "function cur(){return pages.filter(function(p){return!p.hidden})[0]||null}" +
    "function mark(p){[].forEach.call(d.querySelectorAll('[data-nav]'),function(a){a.classList.toggle('on',!!p&&a.getAttribute('data-nav')===p.getAttribute('data-page'))})}" +
    "function find(id,scope){if(!id)return null;var all=[].filter.call(d.querySelectorAll('[id]'),function(e){return e.id===id});" +
    "return all.filter(function(e){return scope&&scope.contains(e)})[0]||all.filter(function(e){return!e.closest('main[data-page]')})[0]||all[0]||null}" +
    "function show(p,push,hash){pages.forEach(function(x){x.hidden=x!==p});mark(p);var t=p.getAttribute('data-title');d.title=t?t+' \u00b7 '+base:base;if(push){try{history.pushState(null,'',hash)}catch(e){}}}" +
    "function top(){try{scrollTo({top:0,behavior:'instant'})}catch(e){scrollTo(0,0)}}" +
    "function go(hash,push){var nt=d.getElementById('nav-t');if(nt)nt.checked=false;" +
    "if(!hash||hash==='#'||hash==='#top'){scrollTo({top:0,behavior:'smooth'});return}" +
    "if(hash.indexOf('#/')===0){if(!pages.length)return;var parts=hash.slice(2).split('/');var p=pages.filter(function(x){return x.getAttribute('data-page')===parts[0]})[0]||pages[0];" +
    "var changed=p!==cur();show(p,push&&changed,hash);var el=parts[1]&&find(parts[1],p);if(el)el.scrollIntoView();else if(changed)top();return}" +
    "var el=find(decodeURIComponent(hash.slice(1)),cur());if(!el)return;var pg=el.closest('main[data-page]');if(pg&&pg.hidden){show(pg,push,'#/'+pg.getAttribute('data-page'));top()}el.scrollIntoView({behavior:'smooth'})}" +
    // Inside a preview frame, open outside links in a new tab instead of inside the frame
    "d.addEventListener('click',function(e){var x=e.target.closest&&e.target.closest('a[href]');if(x&&window.top!==window&&/^https?:/i.test(x.getAttribute('href')))x.target='_blank'},true);" +
    "d.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a[href^=\"#\"]');if(!a||e.defaultPrevented)return;e.preventDefault();go(a.getAttribute('href'),true)});" +
    "addEventListener('popstate',function(){go(location.hash||(pages[0]?'#/'+pages[0].getAttribute('data-page'):'#top'),false)});" +
    "d.addEventListener('click',function(e){var c=e.target.closest&&e.target.closest('.chip');if(!c)return;var box=c.parentNode,grid=box.nextElementSibling,f=c.getAttribute('data-f');" +
    "[].forEach.call(box.querySelectorAll('.chip'),function(x){x.classList.toggle('on',x===c)});" +
    "[].forEach.call(grid.querySelectorAll('.pcard'),function(p){p.hidden=!(f===''||(f==='__avail'?!p.classList.contains('sold'):p.getAttribute('data-g')===f))})});" +
    "if(location.hash&&location.hash.length>1)go(location.hash,false);else mark(cur());" +
    "if('IntersectionObserver'in window&&!matchMedia('(prefers-reduced-motion: reduce)').matches){var io=new IntersectionObserver(function(es){es.forEach(function(x){if(x.isIntersecting){x.target.classList.add('in');io.unobserve(x.target)}})},{rootMargin:'0px 0px -6% 0px'});" +
    "h.classList.add('anim');[].forEach.call(d.querySelectorAll('.sec-head,.pcard,.sec .card,.tile,.media,.hero-copy,.phead .wrap,.signup .wrap,.cta .wrap,.stats-in>div'),function(el){el.classList.add('rv');io.observe(el)})}" +
    "})();";

  var EDIT_CSS = "[data-block]{position:relative;cursor:pointer}[data-block]:hover{outline:2px dashed rgba(212,173,58,.8);outline-offset:-2px}[data-block].sel{outline:3px solid #d4ad3a;outline-offset:-3px}[data-block].sel::before{content:attr(data-label);position:absolute;top:0;left:0;z-index:20;background:#d4ad3a;color:#1b1404;font:700 11px/1 system-ui;padding:5px 8px;letter-spacing:.06em;text-transform:uppercase}a,button{pointer-events:none}";
  var EDIT_JS = "document.addEventListener('click',function(e){var b=e.target.closest('[data-block]');if(b){e.preventDefault();parent.postMessage({mwcSelect:b.getAttribute('data-block')},'*')}},true);" +
    "window.addEventListener('message',function(e){if(!e.data||!e.data.mwcHighlight)return;document.querySelectorAll('[data-block]').forEach(function(x){x.classList.toggle('sel',x.getAttribute('data-block')===e.data.mwcHighlight)});var s=document.querySelector('[data-block].sel');if(s&&e.data.scroll)s.scrollIntoView({block:'nearest',behavior:'smooth'})});";

  // ---------- Pages ----------
  // A design is either one page ({ blocks }) or a multi-page site ({ pages: [{ id, title, slug, blocks, hideInMenu }], shared }).
  // Shared sections show on every page: headers and banners at the top, everything else at the bottom.
  var TOP_TYPES = { header: 1, marquee: 1 };
  function slugify(v) { return String(v || "").toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40); }
  function pageList(design) {
    if (!design || !Array.isArray(design.pages) || !design.pages.length) return null;
    var seen = {};
    return design.pages.map(function (p, i) {
      var slug = slugify(p.slug || p.title) || "page-" + (i + 1);
      while (seen[slug]) slug += "-" + (i + 1);
      seen[slug] = 1;
      return { id: p.id, title: p.title || "Page " + (i + 1), slug: slug, hideInMenu: !!p.hideInMenu, blocks: Array.isArray(p.blocks) ? p.blocks : [] };
    });
  }
  function isDesign(c) {
    var ok = function (list) { return Array.isArray(list) && list.every(function (b) { return b && BLOCKS[b.type]; }); };
    if (!c || typeof c !== "object") return false;
    if (Array.isArray(c.pages) && c.pages.length) return c.pages.every(function (p) { return p && ok(p.blocks); }) && (c.shared == null || ok(c.shared));
    return ok(c.blocks);
  }

  function renderSite(design, opts) {
    opts = opts || {};
    var t = (design && design.theme) || {};
    var pages = pageList(design);
    var ctx = { multi: !!pages, pages: pages || [] };
    var f = FONTS[t.font] || FONTS.modern;
    var empty = '<div style="padding:120px 20px;text-align:center;color:#888;font-family:system-ui">Add a section to get started.</div>';
    function blocksHtml(list) {
      return (list || []).filter(function (b) { return BLOCKS[b.type] && !b.hidden; }).map(function (b) {
        var html = BLOCKS[b.type].render(b, t, ctx);
        return opts.editable ? '<div data-block="' + esc(b.id) + '" data-label="' + esc(BLOCKS[b.type].label) + '"' + (b.id === opts.selected ? ' class="sel"' : "") + ">" + html + "</div>" : html;
      }).join("\n");
    }
    var body;
    if (!pages) body = blocksHtml(design && design.blocks) || empty;
    else {
      var shared = (design.shared || []);
      // The builder shows one page at a time; everywhere else gets every page, switched by the router
      var shown = opts.editable ? [pages.filter(function (p) { return p.id === opts.page || p.slug === opts.page; })[0] || pages[0]] : pages;
      body = blocksHtml(shared.filter(function (b) { return TOP_TYPES[b.type]; })) +
        shown.map(function (p, i) {
          return '<main class="page" data-page="' + esc(p.slug) + '" data-title="' + esc(i === 0 && p === pages[0] ? "" : p.title) + '"' + (i > 0 ? " hidden" : "") + ">\n" + (blocksHtml(p.blocks) || empty) + "\n</main>";
        }).join("\n") +
        blocksHtml(shared.filter(function (b) { return !TOP_TYPES[b.type]; }));
      if (opts.editable) {
        var on = shown[0].slug;
        body = body.replace(/data-nav="([^"]*)"/g, function (m, slug) { return m + (slug === on ? ' class="on"' : ""); });
      }
    }
    return "<!doctype html>\n<html lang=\"en-AU\"" + (opts.editable ? ' class="js"' : "") + "><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">" +
      "<title>" + esc(t.business || "Website") + "</title>" + (opts.noindex ? '<meta name="robots" content="noindex">' : "") + (t.description ? '<meta name="description" content="' + esc(t.description) + '">' : "") +
      '<meta name="theme-color" content="' + esc(t.mode === "dark" ? "#0d1017" : color(t.primary, "#2e9e5b")) + '">' +
      '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
      '<link href="https://fonts.googleapis.com/css2?family=' + f.css + '&display=swap" rel="stylesheet">' +
      "<style>" + themeCss(t) + BASE_CSS + (opts.editable ? EDIT_CSS : "") + (opts.banner ? ".draft-bar{position:sticky;top:0;z-index:50;background:#d4ad3a;color:#1b1404;font:600 13px/1.4 system-ui;text-align:center;padding:8px 14px}.draft-bar~.hdr{top:36px}" : "") + "</style></head><body id=\"top\">\n" + (opts.banner ? '<div class="draft-bar">' + esc(opts.banner) + "</div>" : "") + body + "\n" +
      "<script>" + (opts.editable ? EDIT_JS : SITE_JS) + "</script></body></html>";
  }

  function newBlock(type, theme) {
    var b = BLOCKS[type].defaults(theme || {});
    b.id = uid();
    b.type = type;
    return b;
  }

  // ---------- Starter templates ----------
  function template(name, theme) {
    var t = Object.assign({ business: "Your Business", phone: "", email: "", primary: "#2e9e5b", accent: "#14213d", mode: "light", font: "modern", radius: "soft" }, theme || {});
    var make = function (type, over) { return Object.assign(newBlock(type, t), over || {}); };
    if (name === "trades") {
      t = Object.assign(t, { primary: "#ff8a1f", accent: "#10151f", mode: "dark", font: "bold", radius: "soft" });
      return { version: 1, theme: t, blocks: [
        make("header"),
        make("hero", { layout: "centered", eyebrow: "Warrnambool · Port Fairy · Koroit", heading: "Local tradies who turn up when we say we will", text: "Fast, friendly and fully licensed. Fixed prices before we start, and a 12-month guarantee on every job.", button: t.phone ? "Call " + t.phone : "Get a free quote", buttonLink: t.phone ? telLink(t.phone) : "#contact", button2: "Our services", button2Link: "#services", badges: "Licensed & insured\nSame-day service\nUpfront pricing" }),
        make("services", { heading: "What we do", items: [{ icon: "🔧", title: "Repairs", text: "Fast fixes for leaks, breakdowns and emergencies.", price: "From $120" }, { icon: "🛠️", title: "Installations", text: "New systems installed properly, first time.", price: "From $350" }, { icon: "🚨", title: "Emergencies", text: "24/7 call-outs across the South West.", price: "Call now" }] }),
        make("stats", { items: [{ value: "60 min", label: "Typical emergency response" }, { value: "12 mo", label: "Workmanship guarantee" }, { value: "7 days", label: "A week" }] }),
        make("about"), make("testimonials"), make("faq"),
        make("cta", { heading: "Something broken? We're on our way." }),
        make("contact"), make("footer"),
      ] };
    }
    if (name === "cafe") {
      t = Object.assign(t, { primary: "#e0765a", accent: "#24494d", mode: "light", font: "classic", radius: "round" });
      return { version: 1, theme: t, blocks: [
        make("header", { links: [{ text: "Menu", link: "#pricing" }, { text: "Visit", link: "#hours" }, { text: "Gallery", link: "#gallery" }], cta: "Get directions", ctaLink: "#hours" }),
        make("hero", { layout: "split", eyebrow: "Open 7 days", heading: "Coffee, brunch & sea air", text: "Locally roasted coffee and all-day brunch, a short stroll from the beach.", button: "See the menu", buttonLink: "#pricing", button2: "Find us", button2Link: "#hours" }),
        make("pricing", { heading: "The menu", items: [{ name: "Smashed avo", price: "$21", note: "", features: "Feta, dukkah, poached egg", featured: false }, { name: "The Big Breakfast", price: "$26", note: "", features: "Eggs, bacon, mushrooms, hash brown", featured: true }, { name: "Ricotta hotcakes", price: "$22", note: "", features: "Berries, honeycomb butter", featured: false }] }),
        make("gallery", { heading: "From the kitchen" }), make("testimonials"),
        make("hours", { heading: "Visit us", rows: [{ day: "Mon – Fri", time: "7am – 3pm" }, { day: "Sat – Sun", time: "7:30am – 3pm" }] }),
        make("footer"),
      ] };
    }
    if (name === "salon") {
      t = Object.assign(t, { primary: "#a8717f", accent: "#3b2f3f", mode: "light", font: "elegant", radius: "round" });
      return { version: 1, theme: t, blocks: [
        make("header", { links: [{ text: "Prices", link: "#pricing" }, { text: "About", link: "#about" }, { text: "Reviews", link: "#reviews" }], cta: "Book now", ctaLink: "#contact" }),
        make("hero", { layout: "split", eyebrow: "Hair & beauty studio", heading: "Beautifully unhurried", text: "Colour, cuts, brows and lashes in a calm little studio. Book online in under a minute.", button: "Book an appointment", buttonLink: "#contact", button2: "View prices", button2Link: "#pricing" }),
        make("pricing", { heading: "Services & prices", items: [{ name: "Cut & blow-dry", price: "from $75", note: "", features: "45–60 minutes", featured: false }, { name: "Balayage", price: "from $220", note: "", features: "Includes toner and style", featured: true }, { name: "Brow shape & tint", price: "$45", note: "", features: "30 minutes", featured: false }] }),
        make("about", { flip: true }), make("testimonials"), make("contact"), make("footer"),
      ] };
    }
    return { version: 1, theme: t, blocks: [make("header"), make("hero"), make("contact"), make("footer")] };
  }

  return { BLOCKS: BLOCKS, FONTS: FONTS, RADIUS: RADIUS, TOP_TYPES: TOP_TYPES, renderSite: renderSite, newBlock: newBlock, template: template, pageList: pageList, isDesign: isDesign, slugify: slugify, esc: esc, uid: uid };
});
