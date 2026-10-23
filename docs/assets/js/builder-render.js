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

  // ---------- Products (used by the Products grid and Row sections) ----------
  var PRODUCT_ITEM = [
    { key: "image", label: "Photo (https link)", type: "image" },
    { key: "name", label: "Name", type: "text" },
    { key: "detail", label: "Short description", type: "textarea" },
    { key: "price", label: "Price", type: "text" },
    { key: "tag", label: "Tag (e.g. New, 1 of 1)", type: "text" },
    { key: "group", label: "Category (for filters)", type: "text" },
    { key: "link", label: "Shop link", type: "text" },
    { key: "sold", label: "Sold / claimed", type: "toggle" },
    { key: "description", label: "Full description (quick view)", type: "textarea" },
    { key: "images", label: "More photos (one https link per line)", type: "textarea" },
    { key: "variant", label: "Bag options", type: "textarea", hint: "Shopify variant ID for the Add to bag button, or one option per line: M = 1234567890 = 110. Add \"= sold\" to show an option as sold out. For several choices, write them like Red / Large." },
    { key: "options", label: "Option names (e.g. Colour / Size)", type: "text" },
  ];
  function priceNum(v) { var m = String(v || "").replace(/,/g, "").match(/\d+(\.\d+)?/); return m ? +m[0] : 0; }
  // Bag options: "1234" or lines of "Label = 1234 = price" (add "= sold" when that option has sold out)
  function variants(i) {
    return lines(i.variant).map(function (l) {
      var parts = l.split("=").map(function (x) { return x.trim(); });
      if (parts.length === 1) return /^\d+$/.test(parts[0]) ? ["", parts[0], priceNum(i.price), false] : null;
      return /^\d+$/.test(parts[1]) ? [parts[0], parts[1], parts[2] ? priceNum(parts[2]) : priceNum(i.price), /^sold/i.test(parts[3] || "")] : null;
    }).filter(Boolean);
  }
  function handleOf(i) {
    var m = String(i.link || "").match(/\/products\/([^/?#]+)/);
    return String(m ? m[1] : i.name || "").toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "product";
  }
  function productData(i) {
    return esc(JSON.stringify({
      id: url(i.link, "") || i.name, name: i.name || "", price: i.price || "", n: priceNum(i.price), tag: i.tag || "", group: String(i.group || "").trim(),
      image: img(i.image), images: lines(i.images).map(img).filter(Boolean), detail: i.detail || "", description: i.description || "",
      link: url(i.link, ""), sold: !!i.sold, variants: i.sold ? [] : variants(i), slug: handleOf(i),
      options: String(i.options || "").split("/").map(function (x) { return x.trim(); }).filter(Boolean),
    }));
  }
  var HEART = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.3C1 8.4 3 4.5 6.8 4.5c2.1 0 3.5 1.1 5.2 3 1.7-1.9 3.1-3 5.2-3C21 4.5 23 8.4 21.6 11.7 19.5 16.4 12 21 12 21z"/></svg>';
  function productCard(i, n, soldText) {
    var href = url(i.link, "") || i.name ? "#/p/" + handleOf(i) : "";
    var tag = href ? "a" : "div";
    return '<article class="pcard' + (i.sold ? " sold" : "") + '" data-g="' + esc(String(i.group || "").trim()) + '" data-n="' + priceNum(i.price) + '" data-i="' + n + '" data-p="' + productData(i) + '">' +
      "<" + tag + ' class="pcover"' + (href ? ' href="' + esc(href) + '"' : "") + '><div class="pimg">' +
      (img(i.image) ? '<img src="' + esc(img(i.image)) + '" alt="' + esc(i.name) + '" loading="lazy">' : '<div class="ph" style="--h:' + (n * 61 % 360) + '">🛍</div>') +
      (i.tag ? '<span class="ptag">' + esc(i.tag) + "</span>" : "") + (i.sold ? '<span class="stamp">' + esc(soldText || "Sold") + "</span>" : "") + '</div><div class="pbody"><h3>' + esc(i.name) + "</h3>" +
      (i.detail ? "<p>" + esc(i.detail) + "</p>" : "") + '<div class="prow"><b>' + esc(i.price) + "</b>" + (href ? "<span>" + (i.sold ? "See it →" : "View →") + "</span>" : "") + "</div></div></" + tag + ">" +
      '<button type="button" class="fav" aria-label="Save ' + esc(i.name) + ' to my list" aria-pressed="false">' + HEART + "</button></article>";
  }

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
          '<div class="hdr-end"><div class="hdr-tools">' +
            '<button type="button" class="tool" data-open="search" aria-label="Search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4.2-4.2"/></svg></button>' +
            '<button type="button" class="tool" data-open="list" aria-label="My list">' + HEART + '<i class="count" data-count="list"></i></button>' +
            (t.store ? '<button type="button" class="tool" data-open="bag" aria-label="Shopping bag"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h14l-1 12H6L5 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg><i class="count" data-count="bag"></i></button>' : "") +
          "</div>" + (b.cta ? '<a class="btn btn-p hdr-cta" href="' + esc(url(b.ctaLink, telLink(t.phone))) + '">' + esc(b.cta) + "</a>" : "") +
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
        { key: "items", label: "Products", type: "list", item: PRODUCT_ITEM },
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
          (anySold ? '<button type="button" class="chip" data-f="__avail">Available now <small>' + items.filter(function (i) { return !i.sold; }).length + "</small></button>" : "") +
          '<label class="psort"><span>Sort</span><select aria-label="Sort products"><option value="">Featured</option><option value="lo">Price: low to high</option><option value="hi">Price: high to low</option></select></label></div>' : "";
        return '<section class="sec" id="' + esc(b.anchor || "shop") + '"><div class="wrap">' +
          (b.eyebrow ? '<span class="eyebrow">' + esc(b.eyebrow) + "</span>" : "") + head(b.heading, b.intro) + chips +
          '<div class="pgrid c' + esc(b.columns || "4") + '">' + items.map(function (i, n) { return productCard(i, n, sold); }).join("") + "</div>" +
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
    billboard: {
      label: "Billboard", icon: "▶", desc: "Full-screen rotating slides, cinema style",
      fields: [
        { key: "slides", label: "Slides", type: "list", item: [
          { key: "image", label: "Photo (https link)", type: "image" }, { key: "eyebrow", label: "Small text above", type: "text" }, { key: "heading", label: "Headline", type: "textarea" },
          { key: "text", label: "Text", type: "textarea" }, { key: "button", label: "Main button", type: "text" }, { key: "buttonLink", label: "Main button link", type: "text" },
          { key: "button2", label: "Second button", type: "text" }, { key: "button2Link", label: "Second button link", type: "text" }, { key: "tag", label: "Corner label (e.g. 1 of 1)", type: "text" }] },
        { key: "autoplay", label: "Change slides automatically", type: "toggle" },
      ],
      defaults: function () { return { autoplay: true, slides: [{ image: "", eyebrow: "New", heading: "Your big headline", text: "One line about it.", button: "Shop now", buttonLink: "", button2: "More info", button2Link: "", tag: "" }, { image: "", eyebrow: "", heading: "A second story", text: "", button: "Have a look", buttonLink: "", button2: "", button2Link: "", tag: "" }] }; },
      render: function (b) {
        var slides = b.slides || [];
        return '<section class="bb"' + (b.autoplay ? ' data-auto="1"' : "") + ' aria-roledescription="carousel" aria-label="Featured">' + slides.map(function (sl, n) {
          return '<div class="bb-slide' + (n === 0 ? " on" : "") + '" aria-roledescription="slide" aria-label="' + (n + 1) + " of " + slides.length + '"' + (n ? ' aria-hidden="true"' : "") + ">" +
            (img(sl.image) ? '<img src="' + esc(img(sl.image)) + '" alt=""' + (n ? ' loading="lazy"' : "") + ">" : '<div class="ph" style="--h:' + (n * 83 % 360) + '"></div>') +
            '<div class="bb-copy"><div class="wrap"><div>' + (sl.eyebrow ? '<span class="eyebrow">' + esc(sl.eyebrow) + "</span>" : "") +
            (n === 0 ? "<h1>" : '<h2 class="h1">') + esc(sl.heading).replace(/\n/g, "<br>") + (n === 0 ? "</h1>" : "</h2>") + (sl.text ? '<p class="lead">' + esc(sl.text) + "</p>" : "") +
            '<div class="btns">' + (sl.button ? '<a class="btn btn-p btn-lg" href="' + esc(url(sl.buttonLink)) + '"><svg viewBox="0 0 24 24" aria-hidden="true" class="ic-play"><path d="M7 4l13 8-13 8z"/></svg>' + esc(sl.button) + "</a>" : "") +
            (sl.button2 ? '<a class="btn btn-grey btn-lg" href="' + esc(url(sl.button2Link)) + '"><svg viewBox="0 0 24 24" aria-hidden="true" class="ic-info"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/></svg>' + esc(sl.button2) + "</a>" : "") + "</div></div></div></div>" +
            (sl.tag ? '<span class="bb-tag">' + esc(sl.tag) + "</span>" : "") + "</div>";
        }).join("") + (slides.length > 1 ? '<div class="bb-dots">' + slides.map(function (sl, n) { return '<button type="button" class="bb-dot' + (n === 0 ? " on" : "") + '" aria-label="Show slide ' + (n + 1) + '"><i></i></button>'; }).join("") + "</div>" : "") + "</section>";
      },
    },
    row: {
      label: "Product row", icon: "⇆", desc: "Sideways-scrolling row of products, cinema style",
      fields: [
        { key: "heading", label: "Row title", type: "text" },
        { key: "more", label: "\"See all\" link text", type: "text" },
        { key: "moreLink", label: "\"See all\" link", type: "text" },
        { key: "shape", label: "Card shape", type: "select", options: [["square", "Square"], ["poster", "Tall poster"], ["wide", "Wide"]] },
        { key: "numbered", label: "Big numbers (Top 10 style)", type: "toggle" },
        { key: "soldText", label: "Label for sold products", type: "text" },
        { key: "items", label: "Products", type: "list", item: PRODUCT_ITEM },
      ],
      defaults: function () { return { heading: "New this week", more: "See all", moreLink: "", shape: "square", numbered: false, soldText: "Sold", items: [1, 2, 3, 4, 5, 6].map(function (x) { return { image: "", name: "Product " + x, detail: "", price: "$" + (x * 10), tag: "", link: "" }; }) }; },
      render: function (b) {
        var items = b.items || [];
        return '<section class="row-sec" id="' + esc(b.anchor || "row-" + slugify(b.heading || "products")) + '"><div class="wrap row-head"><h2>' + esc(b.heading) + "</h2>" +
          (b.more && b.moreLink ? '<a class="row-more" href="' + esc(url(b.moreLink)) + '">' + esc(b.more) + " <span aria-hidden=\"true\">›</span></a>" : "") + "</div>" +
          '<div class="rail-wrap"><button type="button" class="rail-btn prev" aria-label="Scroll left" hidden>‹</button><div class="rail ' + esc(b.shape || "square") + (b.numbered ? " top" : "") + '" tabindex="0" aria-label="' + esc(b.heading) + '">' +
          items.map(function (i, n) {
            var href = "#/p/" + handleOf(i), tag = "a";
            return '<article class="rcard' + (i.sold ? " sold" : "") + '" data-p="' + productData(i) + '">' + (b.numbered ? '<span class="rnum" aria-hidden="true">' + (n + 1) + "</span>" : "") +
              "<" + tag + ' class="pcover rimg"' + (href ? ' href="' + esc(href) + '"' : "") + ">" + (img(i.image) ? '<img src="' + esc(img(i.image)) + '" alt="' + esc(i.name) + '" loading="lazy">' : '<div class="ph" style="--h:' + (n * 61 % 360) + '"></div>') +
              (i.tag ? '<span class="ptag">' + esc(i.tag) + "</span>" : "") + (i.sold ? '<span class="stamp">' + esc(b.soldText || "Sold") + "</span>" : "") +
              '<span class="rinfo"><b>' + esc(i.name) + "</b><span>" + esc(i.price) + (i.detail ? " · " + esc(i.detail) : "") + "</span></span></" + tag + ">" +
              '<button type="button" class="fav" aria-label="Save ' + esc(i.name) + ' to my list" aria-pressed="false">' + HEART + "</button></article>";
          }).join("") + '</div><button type="button" class="rail-btn next" aria-label="Scroll right">›</button></div></section>';
      },
    },
    countdown: {
      label: "Countdown", icon: "⏱", desc: "Live countdown to a launch or drop",
      fields: [
        { key: "eyebrow", label: "Small text above", type: "text" },
        { key: "heading", label: "Heading", type: "text" },
        { key: "text", label: "Text", type: "textarea" },
        { key: "date", label: "Date", type: "text", hint: "e.g. 2026-11-01 or 2026-11-01 18:00" },
        { key: "done", label: "Text once the date has passed", type: "text" },
        { key: "button", label: "Button", type: "text" },
        { key: "buttonLink", label: "Button link", type: "text" },
        { key: "image", label: "Background photo (optional)", type: "image" },
      ],
      defaults: function () { var d = new Date(Date.now() + 14 * 864e5); return { eyebrow: "Coming soon", heading: "The next drop", text: "", date: d.toISOString().slice(0, 10), done: "It's here.", button: "Get notified", buttonLink: "", image: "" }; },
      render: function (b) {
        var bg = img(b.image);
        var unit = function (k, l) { return '<div><b data-cd="' + k + '">--</b><span>' + l + "</span></div>"; };
        return '<section class="cd' + (bg ? " has-img" : "") + '"' + (bg ? ' style="--bgimg:url(\'' + esc(bg) + '\')"' : "") + ' id="' + esc(b.anchor || "countdown") + '"><div class="wrap cd-in"><div>' +
          (b.eyebrow ? '<span class="eyebrow">' + esc(b.eyebrow) + "</span>" : "") + "<h2>" + esc(b.heading) + "</h2>" + (b.text ? '<p class="lead">' + esc(b.text) + "</p>" : "") +
          (b.button ? '<div class="btns"><a class="btn btn-p btn-lg" href="' + esc(url(b.buttonLink)) + '">' + esc(b.button) + "</a></div>" : "") + "</div>" +
          '<div class="cd-clock" data-date="' + esc(b.date) + '" data-done="' + esc(b.done || "") + '" role="timer">' + unit("d", "Days") + unit("h", "Hours") + unit("m", "Mins") + unit("s", "Secs") + "</div></div></section>";
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
    ".btn-p{background:var(--p);color:#fff}.btn-o{border-color:currentColor;color:var(--fg);background:transparent}.btn-inv{background:#fff;color:var(--a)}",
    ".hdr{position:sticky;top:0;z-index:10;background:color-mix(in srgb,var(--bg) 88%,transparent);backdrop-filter:blur(10px);border-bottom:1px solid var(--line)}.hdr-in{display:flex;align-items:center;justify-content:space-between;gap:16px;min-height:70px}",
    "[hidden]{display:none!important}.logo{font-family:var(--fh);font-weight:800;font-size:1.25rem;text-decoration:none}.menu{display:flex;gap:22px}.menu a{position:relative;text-decoration:none;font-weight:600;color:var(--muted);transition:color .2s}.menu a:hover,.menu a.on{color:var(--fg)}.menu a.on::after{content:'';position:absolute;left:0;right:0;bottom:-6px;height:2px;border-radius:2px;background:var(--p)}",
    ".hdr-end{display:flex;align-items:center;gap:10px}.nav-t{position:absolute;opacity:0;pointer-events:none}.burger,.drawer{display:none}",
    "@media(max-width:860px){.menu{display:none}.hdr .btn{padding:10px 14px;font-size:.9rem}.burger{display:grid;gap:5px;place-content:center;width:44px;height:44px;border:1px solid var(--line);border-radius:var(--r);cursor:pointer}.burger i{display:block;width:20px;height:2px;border-radius:2px;background:currentColor;transition:transform .25s,opacity .25s}",
    ".nav-t:checked~.burger i:nth-child(1){transform:translateY(7px) rotate(45deg)}.nav-t:checked~.burger i:nth-child(2){opacity:0}.nav-t:checked~.burger i:nth-child(3){transform:translateY(-7px) rotate(-45deg)}.nav-t:focus-visible~.burger{outline:2px solid var(--p)}",
    ".nav-t:checked~.drawer{display:flex;flex-direction:column;position:absolute;left:0;right:0;top:100%;padding:8px 22px 24px;background:var(--bg);border-bottom:1px solid var(--line);box-shadow:0 30px 60px rgba(0,0,0,.35);animation:dr .25s ease-out}.drawer a{padding:14px 0;font-family:var(--fh);font-size:1.25rem;font-weight:700;text-decoration:none;border-bottom:1px solid var(--line)}.drawer a.on{color:var(--p)}.drawer .btn{margin-top:18px;border:0;font-size:1rem}@keyframes dr{from{opacity:0;transform:translateY(-8px)}}}",
    "@media(max-width:600px){.hdr-cta{display:none}.hdr-in{gap:8px}.tool{width:38px;height:38px}}",
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
    ".pcard{position:relative;display:flex;flex-direction:column;background:var(--card);border:1px solid var(--line);border-radius:var(--r);overflow:hidden;text-decoration:none;color:inherit;transition:transform .25s,box-shadow .25s,border-color .25s}.pcard:hover{transform:translateY(-4px);border-color:var(--p);box-shadow:0 18px 40px color-mix(in srgb,var(--p) 25%,transparent)}",
    ".pimg{position:relative;aspect-ratio:1;overflow:hidden;background:var(--bg2)}.pimg img{width:100%;height:100%;object-fit:cover;transition:transform .5s}.pcard:hover .pimg img{transform:scale(1.05)}.pimg .ph{aspect-ratio:1;border-radius:0}",
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
    // Product cards: cover link, save button, sort
    ".pcover{display:flex;flex-direction:column;flex:1;text-decoration:none;color:inherit;cursor:pointer}.btn-block{display:flex;width:100%}.btn-grey{background:rgba(128,128,140,.35);color:#fff;backdrop-filter:blur(6px)}.btn-grey:hover{background:rgba(128,128,140,.5)}.btn svg{width:1.15em;height:1.15em}.ic-play{fill:currentColor}.ic-info{fill:none;stroke:currentColor;stroke-width:2.4;stroke-linecap:round}",
    ".fav{position:absolute;top:10px;right:10px;z-index:2;width:38px;height:38px;border-radius:50%;border:0;display:grid;place-items:center;cursor:pointer;background:rgba(0,0,0,.45);color:#fff;backdrop-filter:blur(6px);opacity:0;transform:scale(.85);transition:opacity .2s,transform .2s,background .2s}.fav svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2}.fav.on{opacity:1;transform:none;background:var(--p)}.fav.on svg{fill:currentColor}",
    ".pcard:hover .fav,.rcard:hover .fav,.fav:focus-visible{opacity:1;transform:none}@media(hover:none){.fav{opacity:1;transform:none}}html:not(.js) .fav,html:not(.js) .hdr-tools{display:none}",
    ".psort{margin-left:auto;display:flex;align-items:center;gap:8px;font-size:.85rem;font-weight:700;color:var(--muted)}.psort select{font:inherit;font-weight:600;color:var(--fg);background:var(--card);border:1px solid var(--line);border-radius:99px;padding:8px 14px}",
    // Header tools
    ".hdr-tools{display:flex;gap:4px}.tool{position:relative;width:42px;height:42px;border:0;border-radius:50%;background:none;color:var(--fg);cursor:pointer;display:grid;place-items:center;transition:background .2s}.tool:hover{background:var(--line)}.tool svg{width:21px;height:21px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}",
    ".count{position:absolute;top:3px;right:2px;min-width:18px;height:18px;padding:0 5px;border-radius:9px;background:var(--p);color:#fff;font:800 11px/18px var(--fb);font-style:normal;text-align:center}.count:empty{display:none}",
    // Billboard
    ".bb{position:relative;height:min(94vh,900px);min-height:560px;overflow:hidden;color:#fff;background:#000;isolation:isolate}.bb-slide{position:absolute;inset:0;opacity:0;visibility:hidden;transition:opacity 1.1s ease,visibility 1.1s}.bb-slide.on{opacity:1;visibility:visible}",
    ".bb-slide>img,.bb-slide>.ph{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;aspect-ratio:auto;border-radius:0;transform:scale(1.1);transition:transform 8s ease-out}.bb-slide.on>img,.bb-slide.on>.ph{transform:scale(1)}",
    ".bb-slide::after{content:'';position:absolute;inset:0;background:linear-gradient(77deg,rgba(0,0,0,.88) 0%,rgba(0,0,0,.45) 42%,transparent 72%),linear-gradient(0deg,var(--bg) 0%,color-mix(in srgb,var(--bg) 60%,transparent) 14%,transparent 34%)}",
    ".bb-copy{position:absolute;z-index:2;left:0;right:0;bottom:17%}.bb-copy .wrap>div{max-width:640px}.bb-copy .lead{color:rgba(255,255,255,.88);font-size:clamp(1rem,1.6vw,1.25rem);max-width:560px;text-shadow:0 2px 12px rgba(0,0,0,.5)}",
    ".bb h1,.bb .h1{font-size:clamp(2.5rem,6.6vw,5.4rem);line-height:.95;margin:0 0 .35em;text-shadow:0 8px 40px rgba(0,0,0,.45)}.bb-slide.on .bb-copy .wrap>div>*{animation:up .9s cubic-bezier(.2,.7,.2,1) both}.bb-slide.on .bb-copy .wrap>div>:nth-child(2){animation-delay:.08s}.bb-slide.on .bb-copy .wrap>div>:nth-child(3){animation-delay:.16s}.bb-slide.on .bb-copy .wrap>div>:nth-child(4){animation-delay:.24s}@keyframes up{from{opacity:0;transform:translateY(24px)}}",
    ".bb-tag{position:absolute;z-index:2;right:0;bottom:30%;background:rgba(40,40,46,.6);border-left:3px solid var(--p);padding:8px 64px 8px 14px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;font-size:.85rem}",
    ".bb-dots{position:absolute;z-index:3;right:max(22px,calc((100vw - 1140px)/2 + 22px));bottom:9%;display:flex;gap:8px}.bb-dot{width:34px;height:4px;padding:0;border:0;border-radius:2px;background:rgba(255,255,255,.3);cursor:pointer;overflow:hidden}.bb-dot i{display:block;height:100%;width:0;background:#fff}",
    ".bb-dot.on i{width:100%}.bb[data-auto] .bb-dot.on i{width:0;animation:bar 7s linear forwards}.bb.paused .bb-dot.on i{animation-play-state:paused}@keyframes bar{to{width:100%}}",
    "@media(max-width:700px){.bb{height:86vh;min-height:520px}.bb-copy{bottom:13%}.bb-slide::after{background:linear-gradient(0deg,var(--bg) 0%,rgba(0,0,0,.7) 40%,rgba(0,0,0,.2) 75%)}.bb-tag{display:none}.bb .btns .btn{flex:1 1 auto}.bb-dots{left:22px;right:auto;bottom:5%}}",
    // Product rows
    ".row-sec{position:relative;padding:26px 0 4px}.row-head{display:flex;align-items:baseline;gap:16px;margin-bottom:4px}.row-head h2{font-size:clamp(1.15rem,2.1vw,1.6rem);margin:0}.row-more{font-size:.9rem;font-weight:700;color:var(--p);text-decoration:none;opacity:0;transform:translateX(-8px);transition:opacity .3s,transform .3s}.row-sec:hover .row-more,.row-more:focus-visible{opacity:1;transform:none}@media(hover:none){.row-more{opacity:1;transform:none}}",
    ".rail-wrap{position:relative}.rail{--gut:max(22px,calc((100vw - 1140px)/2 + 22px));display:grid;grid-auto-flow:column;gap:10px;overflow-x:auto;overscroll-behavior-x:contain;scroll-snap-type:x mandatory;scroll-padding:0 var(--gut);padding:22px var(--gut) 34px;scrollbar-width:none}.rail::-webkit-scrollbar{display:none}",
    ".rail.square{grid-auto-columns:clamp(150px,17.5vw,236px)}.rail.poster{grid-auto-columns:clamp(130px,14vw,196px)}.rail.wide{grid-auto-columns:clamp(240px,27vw,360px)}.rail.top{grid-auto-columns:clamp(210px,24vw,330px)}",
    ".rcard{position:relative;scroll-snap-align:start;display:flex;align-items:flex-end;transition:transform .35s cubic-bezier(.2,.7,.2,1),z-index 0s .35s}.rcard:hover{z-index:3;transition:transform .35s cubic-bezier(.2,.7,.2,1)}@media(hover:hover){.rcard:hover{transform:scale(1.1)}.rail .rcard:first-child:hover{transform-origin:left}.rail .rcard:last-child:hover{transform-origin:right}}",
    ".rimg{position:relative;display:block;flex:1;aspect-ratio:1;border-radius:calc(var(--r)*.6);overflow:hidden;background:var(--bg2);box-shadow:0 10px 30px rgba(0,0,0,.35)}.rail.poster .rimg{aspect-ratio:2/3}.rail.wide .rimg{aspect-ratio:16/10}.rimg img,.rimg .ph{width:100%;height:100%;object-fit:cover;aspect-ratio:auto;border-radius:0}",
    ".rinfo{position:absolute;left:0;right:0;bottom:0;padding:34px 12px 11px;background:linear-gradient(0deg,rgba(0,0,0,.92),transparent);color:#fff;display:flex;flex-direction:column;gap:1px;transform:translateY(30%);opacity:.0;transition:opacity .3s,transform .3s}.rinfo b{font-size:.92rem;line-height:1.2}.rinfo span{font-size:.76rem;opacity:.8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
    ".rcard:hover .rinfo,.rcard:focus-within .rinfo{opacity:1;transform:none}@media(hover:none){.rinfo{opacity:1;transform:none}}.rcard .ptag{top:10px;left:10px}.rcard .stamp{font-size:.95rem}.rcard.sold .rimg img{filter:grayscale(1) brightness(.5)}",
    ".rnum{font-family:var(--fh);font-weight:900;font-size:clamp(6rem,11vw,10.5rem);line-height:.74;letter-spacing:-.06em;color:var(--bg);-webkit-text-stroke:3px color-mix(in srgb,var(--fg) 55%,transparent);margin-right:-.2em;flex:none;user-select:none}.rail.top .rimg{flex:0 0 62%}",
    ".rail-btn{position:absolute;top:22px;bottom:34px;z-index:4;width:max(22px,calc((100vw - 1140px)/2 + 22px));min-width:44px;border:0;background:color-mix(in srgb,var(--bg) 55%,transparent);color:#fff;font-size:2.6rem;cursor:pointer;opacity:0;transition:opacity .25s,background .25s}.rail-btn.prev{left:0}.rail-btn.next{right:0}.rail-wrap:hover .rail-btn{opacity:1}.rail-btn:hover{background:color-mix(in srgb,var(--bg) 75%,transparent)}@media(hover:none){.rail-btn{display:none}}html:not(.js) .rail-btn{display:none}",
    // Countdown
    ".cd{position:relative;padding:80px 0;background:radial-gradient(700px 300px at 85% 50%,color-mix(in srgb,var(--p) 30%,transparent),transparent 70%),var(--bg2);overflow:hidden}.cd.has-img{background:linear-gradient(90deg,var(--bg) 20%,color-mix(in srgb,var(--bg) 55%,transparent)),var(--bgimg) center/cover no-repeat}",
    ".cd-in{display:grid;grid-template-columns:1fr auto;gap:40px;align-items:center}.cd-clock{display:grid;grid-template-columns:repeat(4,minmax(78px,1fr));gap:10px}.cd-clock>div{background:color-mix(in srgb,var(--card) 85%,transparent);border:1px solid var(--line);border-radius:var(--r);padding:18px 10px;text-align:center;backdrop-filter:blur(8px)}",
    ".cd-clock b{display:block;font-family:var(--fh);font-size:clamp(2rem,4.4vw,3.4rem);line-height:1;color:var(--p);font-variant-numeric:tabular-nums}.cd-clock span{display:block;margin-top:8px;font-size:.72rem;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}.cd-done{grid-column:1/-1;font-family:var(--fh);font-size:2rem;margin:0}",
    "@media(max-width:860px){.cd-in{grid-template-columns:1fr}.cd-clock{grid-template-columns:repeat(4,1fr);gap:8px}.cd-clock>div{padding:14px 4px}}",
    // Overlays: quick view, side panels, search, toast, back to top
    "body.ov-open{overflow:hidden}.ov{position:fixed;inset:0;z-index:100;background:rgba(0,0,0,.72);backdrop-filter:blur(6px);display:flex;justify-content:center;align-items:flex-start;overflow-y:auto;padding:5vh 16px;animation:fade .25s ease-out}@keyframes fade{from{opacity:0}}",
    ".ov-box{position:relative;width:min(940px,100%);background:var(--card);color:var(--fg);border:1px solid var(--line);border-radius:calc(var(--r) + 4px);box-shadow:0 40px 120px rgba(0,0,0,.6);animation:pop .35s cubic-bezier(.2,.7,.2,1)}@keyframes pop{from{opacity:0;transform:translateY(24px) scale(.97)}}",
    ".ov-x{position:absolute;top:12px;right:12px;z-index:3;width:40px;height:40px;border-radius:50%;border:0;background:rgba(0,0,0,.55);color:#fff;font-size:1.6rem;line-height:1;cursor:pointer}.ov-x:hover{background:var(--p)}",
    ".qv{display:grid;grid-template-columns:1.05fr 1fr}.qv-media{padding:14px}.qv-main{position:relative;aspect-ratio:1;border-radius:var(--r);overflow:hidden;background:var(--bg2)}.qv-main img{width:100%;height:100%;object-fit:cover}.qv-thumbs{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap}",
    ".qv-thumb{width:62px;height:62px;padding:0;border-radius:10px;overflow:hidden;border:2px solid transparent;cursor:pointer;background:none;opacity:.6}.qv-thumb.on{border-color:var(--p);opacity:1}.qv-thumb img{width:100%;height:100%;object-fit:cover}",
    ".qv-info{padding:34px 30px 30px 16px;display:flex;flex-direction:column;gap:10px}.qv-info h2{font-size:clamp(1.6rem,3vw,2.3rem);margin:0}.qv-tag,.qv-group{display:inline-block;font-size:.72rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase;margin-right:8px}.qv-tag{background:var(--p);color:#fff;padding:4px 10px;border-radius:99px}.qv-group{color:var(--muted)}",
    ".qv-price{font-family:var(--fh);font-size:1.7rem;color:var(--p)}.qv-price em{font-style:normal;font-family:var(--fb);font-size:.9rem;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.1em;margin-left:8px}.qv-desc{color:var(--muted);margin:0;font-size:.98rem}",
    ".qv-opts{display:flex;flex-wrap:wrap;gap:8px}.qv-opt{font:inherit;font-weight:700;padding:9px 16px;border-radius:10px;border:1px solid var(--line);background:var(--bg2);color:var(--fg);cursor:pointer}.qv-opt.on{border-color:var(--p);background:color-mix(in srgb,var(--p) 20%,var(--bg2))}",
    ".qv-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:8px}.qv-actions .btn{flex:1 1 auto}.qv-gone{flex:1 1 100%;margin:0;padding:12px 14px;border-radius:10px;background:var(--bg2);color:var(--muted);font-size:.92rem}",
    ".qv-like{grid-column:1/-1;padding:4px 24px 26px;border-top:1px solid var(--line)}.qv-like h3,.srch-res h3{font-size:1.1rem;margin:18px 0 12px}.qv-like-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px}",
    ".qv-card{font:inherit;color:inherit;text-align:left;background:var(--bg2);border:1px solid var(--line);border-radius:var(--r);overflow:hidden;padding:0 0 10px;cursor:pointer;transition:transform .25s,border-color .25s}.qv-card:hover{transform:translateY(-3px);border-color:var(--p)}.qv-card img{width:100%;aspect-ratio:1;object-fit:cover;margin-bottom:8px}.qv-card b,.qv-card span{display:block;padding:0 10px;font-size:.85rem}.qv-card span{color:var(--muted)}.qv-card.sold img{filter:grayscale(1) brightness(.55)}",
    "@media(max-width:760px){.ov{padding:0;align-items:flex-end}.ov-box{border-radius:20px 20px 0 0;max-height:94vh;overflow-y:auto}.qv{grid-template-columns:1fr}.qv-info{padding:6px 20px 22px}.qv-like{padding:0 20px 24px}}",
    ".ov-sheet{justify-content:flex-end;align-items:stretch;padding:0}.ov-sheet .ov-box{width:min(440px,100%);border-radius:0;min-height:100%;padding:28px 24px;display:flex;flex-direction:column;animation:slide .35s cubic-bezier(.2,.7,.2,1)}@keyframes slide{from{transform:translateX(100%)}}.ov-sheet h2{font-size:1.6rem;margin:0 0 18px}",
    ".sheet-list{display:flex;flex-direction:column;gap:10px;flex:1}.sheet-row{display:flex;align-items:center;gap:10px;padding:10px;border-radius:var(--r);background:var(--bg2)}.sheet-empty{color:var(--muted)}.sheet-rm{width:34px;height:34px;border:0;border-radius:50%;background:none;color:var(--muted);font-size:1.4rem;cursor:pointer}.sheet-rm:hover{color:var(--fg);background:var(--line)}",
    ".mini{display:flex;align-items:center;gap:12px;flex:1;min-width:0}.mini-img{width:64px;height:64px;flex:none;padding:0;border:0;border-radius:10px;overflow:hidden;background:var(--card);cursor:pointer}.mini-img img{width:100%;height:100%;object-fit:cover}.mini-txt{min-width:0}.mini-name{display:block;font:inherit;font-weight:700;color:var(--fg);background:none;border:0;padding:0;text-align:left;cursor:pointer}.mini-txt span{font-size:.85rem;color:var(--muted)}",
    ".qty{display:flex;align-items:center;gap:6px;font-weight:700;font-size:.85rem}.qty button{width:28px;height:28px;border-radius:50%;border:1px solid var(--line);background:none;color:var(--fg);cursor:pointer}.sheet-foot{border-top:1px solid var(--line);padding-top:18px;margin-top:18px}.sheet-total{display:flex;justify-content:space-between;font-size:1.15rem}.sheet-total b{font-family:var(--fh);color:var(--p)}",
    ".ov-search{background:color-mix(in srgb,var(--bg) 94%,transparent)}.ov-search .ov-box{width:min(1100px,100%);background:none;border:0;box-shadow:none}.srch-in{width:100%;font:inherit;font-size:clamp(1.4rem,3vw,2.2rem);font-family:var(--fh);padding:18px 60px 18px 22px;border-radius:var(--r);border:1px solid var(--line);background:var(--card);color:var(--fg)}.srch-in:focus{outline:2px solid var(--p)}",
    ".toast{position:fixed;left:50%;bottom:24px;z-index:120;transform:translate(-50%,30px);opacity:0;background:var(--fg);color:var(--bg);font-weight:700;padding:12px 20px;border-radius:99px;box-shadow:0 20px 50px rgba(0,0,0,.4);transition:opacity .3s,transform .3s;max-width:calc(100vw - 32px)}.toast.on{opacity:1;transform:translate(-50%,0)}",
    ".totop{position:fixed;right:18px;bottom:18px;z-index:40;width:46px;height:46px;border-radius:50%;border:1px solid var(--line);background:var(--card);color:var(--fg);font-size:1.2rem;cursor:pointer;opacity:0;pointer-events:none;transform:translateY(10px);transition:opacity .3s,transform .3s}.totop.on{opacity:1;pointer-events:auto;transform:none}.totop:hover{background:var(--p);color:#fff}",
    // Product pages
    "body.pp-on>:not(.hdr):not(.mq):not(.ftr):not(.pp-page):not(.draft-bar):not(.ov-layer):not(.toast):not(.totop):not(script){display:none}.pp-page{padding:28px 0 90px}",
    ".crumbs{display:flex;align-items:center;gap:14px;font-size:.88rem;color:var(--muted);margin-bottom:22px}.pp-back{font:inherit;font-weight:700;color:var(--fg);background:var(--card);border:1px solid var(--line);border-radius:99px;padding:8px 16px;cursor:pointer}.pp-back:hover{border-color:var(--p)}",
    ".pp-grid{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:48px;align-items:start}.pp-gallery{position:sticky;top:90px}.pp-main{position:relative;aspect-ratio:1;border-radius:var(--r);overflow:hidden;background:var(--bg2);box-shadow:0 30px 80px rgba(0,0,0,.35)}.pp-main img{width:100%;height:100%;object-fit:cover;animation:fade .35s}",
    ".pp-main .stamp{font-size:1.6rem}.pp-main.gone img{filter:grayscale(1) brightness(.55)}.pp-nav{position:absolute;top:50%;transform:translateY(-50%);width:46px;height:46px;border-radius:50%;border:0;background:rgba(0,0,0,.5);color:#fff;font-size:1.8rem;cursor:pointer;opacity:0;transition:opacity .2s}.pp-main:hover .pp-nav{opacity:1}.pp-nav.prev{left:12px}.pp-nav.next{right:12px}@media(hover:none){.pp-nav{opacity:1}}",
    ".pp-thumbs{display:flex;gap:10px;margin-top:12px;flex-wrap:wrap}.pp-thumbs .qv-thumb{width:76px;height:76px}",
    ".pp-info{display:flex;flex-direction:column;gap:12px}.pp-info>.qv-tag,.pp-info>.qv-group{align-self:flex-start}.pp-info h1{font-size:clamp(2rem,4.4vw,3.4rem);margin:4px 0 0}.pp-price{display:flex;align-items:baseline;gap:14px;flex-wrap:wrap}.pp-price b{font-family:var(--fh);font-size:2rem;color:var(--p)}.pp-stock{font-size:.85rem;font-weight:700;color:#4ade80}.pp-stock::before{content:'\\25CF  '}.pp-stock.no{color:var(--muted)}.pp-stock:empty{display:none}",
    ".pp-lead{margin:0;color:var(--muted);font-size:1.05rem}.pp-opt-name{font-size:.85rem;font-weight:700;color:var(--muted);margin-bottom:8px}.pp-opt-name b{color:var(--fg)}.pp-vals{display:flex;flex-wrap:wrap;gap:8px}",
    ".pp-val{font:inherit;font-weight:700;font-size:.92rem;padding:10px 16px;border-radius:10px;border:1px solid var(--line);background:var(--card);color:var(--fg);cursor:pointer;transition:border-color .2s,background .2s}.pp-val:hover{border-color:var(--p)}.pp-val.on{border-color:var(--p);background:color-mix(in srgb,var(--p) 22%,var(--card))}.pp-val.out{opacity:.45;text-decoration:line-through}",
    ".pp-qty{display:flex;align-items:center;gap:14px;font-size:.85rem;font-weight:700;color:var(--muted)}.pp-qty .qty{font-size:1rem;color:var(--fg);gap:12px}.pp-qty .qty button{width:36px;height:36px}",
    ".pp-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:6px}.pp-actions .btn{flex:1 1 auto}.pp-actions .btn:disabled{opacity:.45;cursor:not-allowed;transform:none}.pp-actions .pp-add,.pp-actions .pp-buy{flex:1 1 40%}",
    ".pp-perks{list-style:none;padding:16px 18px;margin:6px 0 0;border:1px solid var(--line);border-radius:var(--r);background:var(--card);display:grid;gap:8px;font-size:.92rem}.pp-perks li::before{content:'\\2713';color:var(--p);font-weight:900;margin-right:10px}",
    ".pp-info .faq p{color:var(--muted)}.pp-more{margin-top:64px}.pp-more h2{font-size:clamp(1.2rem,2.2vw,1.6rem)}.pp-more .qv-like-grid{grid-template-columns:repeat(auto-fill,minmax(170px,1fr))}",
    ".pp-bar{display:none}@media(max-width:860px){.pp-grid{grid-template-columns:1fr;gap:24px}.pp-gallery{position:static}.pp-page{padding-bottom:110px}.pp-bar{display:flex;align-items:center;gap:12px;position:fixed;left:0;right:0;bottom:0;z-index:45;padding:12px 16px calc(12px + env(safe-area-inset-bottom));background:color-mix(in srgb,var(--bg) 92%,transparent);backdrop-filter:blur(14px);border-top:1px solid var(--line)}.pp-bar>div{flex:1;min-width:0}.pp-bar b{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:.95rem}.pp-bar span{color:var(--p);font-weight:800}body.pp-on .totop{bottom:86px}}",
    // Cinema look: deeper blacks, glass header that turns solid, bigger type and glowing cards
    ".cine{--bg:#09090c;--bg2:#121218;--card:#17171f;--line:rgba(255,255,255,.08)}.cine .hdr{background:linear-gradient(180deg,rgba(0,0,0,.8),rgba(0,0,0,0));border-bottom-color:transparent;backdrop-filter:none;transition:background .4s,border-color .4s}.cine .hdr.solid{background:color-mix(in srgb,var(--bg) 92%,transparent);backdrop-filter:blur(14px);border-bottom-color:var(--line)}",
    ".cine main>.bb:first-child{margin-top:-71px}.cine .sec{padding:76px 0}.cine .sec-head h2,.cine .phead h1{letter-spacing:-.01em}.cine .card,.cine .pcard{box-shadow:none}.cine .pcard:hover{box-shadow:0 24px 60px color-mix(in srgb,var(--p) 28%,transparent)}",
    ".cine .stats{background:linear-gradient(90deg,var(--bg),color-mix(in srgb,var(--a) 80%,var(--bg)),var(--bg));border-top:1px solid var(--line);border-bottom:1px solid var(--line)}.cine .phead{background:radial-gradient(900px 380px at 10% -10%,color-mix(in srgb,var(--p) 30%,transparent),transparent 70%),linear-gradient(180deg,#000,var(--bg))}",
    ".cine .cta{background:radial-gradient(800px 340px at 50% 120%,color-mix(in srgb,var(--p) 55%,transparent),transparent 70%),linear-gradient(180deg,var(--bg),#000)}.cine .ftr{background:#000}.cine .mq{position:relative;z-index:11}",
    // Pages and scroll-in animation
    "main.page{animation:pg .45s ease-out}@keyframes pg{from{opacity:0}}",
    ".anim .rv{opacity:0;translate:0 22px;transition:opacity .8s cubic-bezier(.2,.7,.2,1),translate .8s cubic-bezier(.2,.7,.2,1)}.anim .rv.in{opacity:1;translate:none}.anim .pgrid>.rv:nth-child(4n+2),.anim .tiles>.rv:nth-child(3n+2),.anim .grid3>.rv:nth-child(3n+2),.anim .steps>.rv:nth-child(3n+2){transition-delay:.08s}.anim .pgrid>.rv:nth-child(4n+3),.anim .tiles>.rv:nth-child(3n),.anim .grid3>.rv:nth-child(3n),.anim .steps>.rv:nth-child(3n){transition-delay:.16s}.anim .pgrid>.rv:nth-child(4n){transition-delay:.24s}",
    "@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important}html{scroll-behavior:auto}}",
  ].join("");

  // Runs on published pages (it's turned into a string, so it can't use anything from this file):
  // page switching, anchor links, the mobile menu, filters and sorting, scroll-in animation, product rows,
  // billboards, countdowns, product pages, My List, the shopping bag and search.
  function siteScript() {
    var d = document, h = d.documentElement, body = d.body, base = d.title;
    var $$ = function (sel, root) { return [].slice.call((root || d).querySelectorAll(sel)); };
    h.classList.add("js");
    var pages = $$("main[data-page]");
    var store = (body.getAttribute("data-store") || "").replace(/\/+$/, "");
    var key = "mwc:" + (body.getAttribute("data-site") || "site");
    var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    var site = {};
    try { site = JSON.parse(d.getElementById("site-data").textContent); } catch (e) { /* none */ }
    function escH(v) { return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

    // ----- Saved state (falls back to memory where storage is blocked, e.g. in a preview frame)
    var mem = {};
    function load(k) { try { var v = localStorage.getItem(key + ":" + k); if (v) return JSON.parse(v); } catch (e) { /* blocked */ } return mem[k] || []; }
    function save(k, v) { mem[k] = v; try { localStorage.setItem(key + ":" + k, JSON.stringify(v)); } catch (e) { /* blocked */ } }
    var fav = load("list"), bag = load("bag"), seen = load("seen");
    // Product pages are drawn into this page when you open one
    var ppage = d.createElement("main");
    ppage.className = "page pp-page";
    ppage.setAttribute("data-page", "__product");
    ppage.hidden = true;
    var lastMain = pages[pages.length - 1] || d.querySelector(".ftr");
    if (pages.length) lastMain.parentNode.insertBefore(ppage, lastMain.nextSibling);
    else if (lastMain) lastMain.parentNode.insertBefore(ppage, lastMain);
    else body.appendChild(ppage);

    // ----- Pages and anchors
    function cur() { return pages.filter(function (p) { return !p.hidden; })[0] || null; }
    function mark(p) { $$("[data-nav]").forEach(function (a) { a.classList.toggle("on", !!p && a.getAttribute("data-nav") === p.getAttribute("data-page")); }); }
    function find(id, scope) {
      if (!id) return null;
      var all = $$("[id]").filter(function (e) { return e.id === id; });
      return all.filter(function (e) { return scope && scope.contains(e); })[0] || all.filter(function (e) { return !e.closest("main[data-page]"); })[0] || all[0] || null;
    }
    function show(p, push, hash) {
      pages.forEach(function (x) { x.hidden = x !== p; });
      ppage.hidden = p !== ppage;
      body.classList.toggle("pp-on", p === ppage);
      if (p !== ppage) ppage.innerHTML = "";
      mark(p);
      var t = p ? p.getAttribute("data-title") : "";
      d.title = t ? t + " · " + base : base;
      if (push) { try { history.pushState(null, "", hash); } catch (e) { /* not allowed in some frames */ } }
      rails();
    }
    function top() { try { scrollTo({ top: 0, behavior: "instant" }); } catch (e) { scrollTo(0, 0); } }
    function go(hash, push) {
      var nt = d.getElementById("nav-t");
      if (nt) nt.checked = false;
      closeAll();
      if (!hash || hash === "#" || hash === "#top") { scrollTo({ top: 0, behavior: "smooth" }); return; }
      if (hash.indexOf("#/") === 0) {
        var parts = hash.slice(2).split("/");
        if (parts[0] === "p" && parts[1]) {
          var pr = bySlug[decodeURIComponent(parts[1])];
          if (pr) {
            if (ppage.hidden) cameFrom = { hash: cur() ? "#/" + cur().getAttribute("data-page") : "#top", y: scrollY || 0 };
            productPage(pr); show(ppage, push, hash); top(); return;
          }
        }
        if (!pages.length) { if (!ppage.hidden) { show(null, push, hash); top(); } return; }
        var p = pages.filter(function (x) { return x.getAttribute("data-page") === parts[0]; })[0] || pages[0];
        var changed = p !== cur();
        show(p, push && changed, hash);
        var target = parts[1] && find(parts[1], p);
        if (target) target.scrollIntoView(); else if (changed) top();
        return;
      }
      var el = find(decodeURIComponent(hash.slice(1)), cur());
      if (!el) return;
      var pg = el.closest("main[data-page]");
      if (pg && pg.hidden) { show(pg, push, "#/" + pg.getAttribute("data-page")); top(); }
      else if (!pg && !ppage.hidden && !pages.length) show(null, push, "#top");
      el.scrollIntoView({ behavior: "smooth" });
    }
    // Inside a preview frame, open outside links in a new tab instead of inside the frame
    d.addEventListener("click", function (e) {
      var x = e.target.closest && e.target.closest("a[href]");
      if (x && window.top !== window && /^https?:/i.test(x.getAttribute("href"))) x.target = "_blank";
    }, true);
    d.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a || e.defaultPrevented) return;
      e.preventDefault();
      go(a.getAttribute("href"), true);
    });
    addEventListener("popstate", function () { go(location.hash || (pages[0] ? "#/" + pages[0].getAttribute("data-page") : "#top"), false); });
    // "Back" from a product page returns to where you were (without touching the browser history of a page this is shown inside)
    var cameFrom = null;
    function back() {
      var to = cameFrom || { hash: pages[0] ? "#/" + pages[0].getAttribute("data-page") : "#top", y: 0 };
      go(to.hash, true);
      setTimeout(function () { try { scrollTo({ top: to.y, behavior: "instant" }); } catch (e) { scrollTo(0, to.y); } }, 0);
    }

    // ----- Filters and sorting
    d.addEventListener("click", function (e) {
      var c = e.target.closest && e.target.closest(".chip");
      if (!c) return;
      var box = c.parentNode, grid = box.nextElementSibling, f = c.getAttribute("data-f");
      $$(".chip", box).forEach(function (x) { x.classList.toggle("on", x === c); });
      $$(".pcard", grid).forEach(function (p) { p.hidden = !(f === "" || (f === "__avail" ? !p.classList.contains("sold") : p.getAttribute("data-g") === f)); });
    });
    d.addEventListener("change", function (e) {
      if (!e.target.closest || !e.target.closest(".psort")) return;
      var grid = e.target.closest(".chips").nextElementSibling, v = e.target.value;
      $$(".pcard", grid).sort(function (a, b) {
        var na = +a.getAttribute("data-n"), nb = +b.getAttribute("data-n"), ia = +a.getAttribute("data-i"), ib = +b.getAttribute("data-i");
        return v === "lo" ? na - nb || ia - ib : v === "hi" ? nb - na || ia - ib : ia - ib;
      }).forEach(function (p) { grid.appendChild(p); });
    });

    // ----- Header turns solid once you scroll; back-to-top button
    var hdr = d.querySelector(".hdr");
    var totop = d.createElement("button");
    totop.type = "button"; totop.className = "totop"; totop.setAttribute("aria-label", "Back to top"); totop.innerHTML = "&uarr;";
    totop.onclick = function () { scrollTo({ top: 0, behavior: "smooth" }); };
    body.appendChild(totop);
    function onScroll() { var y = scrollY || 0; if (hdr) hdr.classList.toggle("solid", y > 40); totop.classList.toggle("on", y > 900); }
    addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    // ----- Product rows: arrow buttons
    function rails() {
      $$(".rail").forEach(function (r) {
        var w = r.parentNode, prev = w.querySelector(".prev"), next = w.querySelector(".next");
        prev.hidden = r.scrollLeft < 8;
        next.hidden = r.scrollLeft + r.clientWidth >= r.scrollWidth - 8;
      });
    }
    $$(".rail").forEach(function (r) { r.addEventListener("scroll", rails, { passive: true }); });
    addEventListener("resize", rails);
    d.addEventListener("click", function (e) {
      var b = e.target.closest && e.target.closest(".rail-btn");
      if (!b) return;
      var r = b.parentNode.querySelector(".rail");
      r.scrollBy({ left: (b.classList.contains("next") ? 1 : -1) * r.clientWidth * 0.85, behavior: reduce ? "auto" : "smooth" });
    });

    // ----- Billboards
    $$(".bb").forEach(function (bb) {
      var slides = $$(".bb-slide", bb), dots = $$(".bb-dot", bb), at = 0, timer = null;
      if (slides.length < 2) return;
      function to(n) {
        at = (n + slides.length) % slides.length;
        slides.forEach(function (s, i) { s.classList.toggle("on", i === at); s.setAttribute("aria-hidden", i === at ? "false" : "true"); });
        dots.forEach(function (x, i) { x.classList.remove("on"); if (i === at) { void x.offsetWidth; x.classList.add("on"); } });
      }
      function play() { stop(); if (bb.getAttribute("data-auto") && !reduce) timer = setInterval(function () { if (!bb.closest("main[hidden]")) to(at + 1); }, 7000); }
      function stop() { if (timer) clearInterval(timer); timer = null; }
      dots.forEach(function (x, i) { x.onclick = function () { to(i); play(); }; });
      bb.addEventListener("mouseenter", function () { stop(); bb.classList.add("paused"); });
      bb.addEventListener("mouseleave", function () { bb.classList.remove("paused"); play(); });
      var sx = null;
      bb.addEventListener("touchstart", function (e) { sx = e.touches[0].clientX; }, { passive: true });
      bb.addEventListener("touchend", function (e) { if (sx === null) return; var dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 50) { to(at + (dx < 0 ? 1 : -1)); play(); } sx = null; });
      play();
    });

    // ----- Countdowns
    var clocks = $$(".cd-clock");
    function tick() {
      clocks.forEach(function (c) {
        var when = new Date(String(c.getAttribute("data-date")).replace(" ", "T")).getTime();
        if (isNaN(when)) return;
        var left = Math.max(0, when - Date.now());
        var set = function (k, v) { var el = c.querySelector('[data-cd="' + k + '"]'); if (el) el.textContent = v < 10 && k !== "d" ? "0" + v : v; };
        set("d", Math.floor(left / 864e5)); set("h", Math.floor(left / 36e5) % 24); set("m", Math.floor(left / 6e4) % 60); set("s", Math.floor(left / 1e3) % 60);
        if (!left && c.getAttribute("data-done")) c.innerHTML = '<p class="cd-done">' + escH(c.getAttribute("data-done")) + "</p>";
      });
    }
    if (clocks.length) { tick(); setInterval(tick, 1000); }

    // ----- Products: an index of every product on the site, from the cards
    var index = {}, order = [], bySlug = {};
    $$("[data-p]").forEach(function (el) {
      var p;
      try { p = JSON.parse(el.getAttribute("data-p")); } catch (e) { return; }
      if (!index[p.id]) {
        var slug = p.slug || "product", n = 2;
        while (bySlug[slug]) slug = (p.slug || "product") + "-" + n++;
        p.slug = slug;
        index[p.id] = p; bySlug[slug] = p; order.push(p.id);
      }
    });
    function product(el) { var c = el.closest("[data-p]"); if (!c) return null; try { return index[JSON.parse(c.getAttribute("data-p")).id]; } catch (e) { return null; } }

    // ----- Overlays (quick view, side panels, search)
    var layer = d.createElement("div");
    layer.className = "ov-layer";
    body.appendChild(layer);
    var lastFocus = null;
    function open(html, kind) {
      lastFocus = d.activeElement;
      layer.innerHTML = '<div class="ov ov-' + kind + '" role="dialog" aria-modal="true"><div class="ov-box">' + '<button type="button" class="ov-x" aria-label="Close">&times;</button>' + html + "</div></div>";
      body.classList.add("ov-open");
      var f = layer.querySelector("input,button:not(.ov-x),a") || layer.querySelector(".ov-x");
      setTimeout(function () { f.focus(); }, 30);
    }
    function closeAll() {
      if (!layer.innerHTML) return;
      layer.innerHTML = "";
      body.classList.remove("ov-open");
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }
    layer.addEventListener("click", function (e) { if (e.target.classList.contains("ov") || e.target.closest(".ov-x")) closeAll(); });
    d.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeAll();
      if (e.key === "/" && !/INPUT|TEXTAREA|SELECT/.test((d.activeElement || {}).tagName || "") && order.length) { e.preventDefault(); openSearch(); }
    });

    function toast(msg) {
      var t = d.createElement("div");
      t.className = "toast";
      t.setAttribute("role", "status");
      t.textContent = msg;
      body.appendChild(t);
      setTimeout(function () { t.classList.add("on"); }, 10);
      setTimeout(function () { t.classList.remove("on"); setTimeout(function () { t.remove(); }, 400); }, 2600);
    }

    // My List
    function isFav(id) { return fav.indexOf(id) >= 0; }
    function toggleFav(id) {
      var p = index[id];
      if (isFav(id)) fav.splice(fav.indexOf(id), 1); else fav.unshift(id);
      save("list", fav);
      counts();
      toast(isFav(id) ? "Added " + (p ? p.name : "") + " to My List" : "Removed from My List");
    }
    // Bag: [{ id, v (variant id), label, n (price), qty }]
    function bagCount() { return bag.reduce(function (n, x) { return n + x.qty; }, 0); }
    function addToBag(p, v, qty, quiet) {
      qty = qty || 1;
      var line = bag.filter(function (x) { return x.v === v[1]; })[0];
      var single = oneOff(p);
      if (line) { if (single) { if (!quiet) toast("There's only one of these, and it's already in your bag"); return; } line.qty = Math.min(20, line.qty + qty); }
      else bag.push({ id: p.id, v: v[1], label: single ? "" : v[0], n: v[2] || p.n, qty: single ? 1 : qty });
      save("bag", bag);
      counts();
      if (!quiet) toast("Added to bag: " + p.name + (v[0] && !single ? " (" + v[0] + ")" : ""));
    }
    function counts() {
      $$('[data-count="list"]').forEach(function (c) { c.textContent = fav.length || ""; });
      $$('[data-count="bag"]').forEach(function (c) { var n = bagCount(); c.textContent = n || ""; });
      $$(".fav").forEach(function (b) { var p = product(b); var on = !!p && isFav(p.id); b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); });
    }
    function mini(p, extra) {
      return '<div class="mini"><button type="button" class="mini-img" data-pp="' + escH(p.slug) + '">' + (p.image ? '<img src="' + escH(p.image) + '" alt="">' : "") + "</button>" +
        '<div class="mini-txt"><button type="button" class="mini-name" data-pp="' + escH(p.slug) + '">' + escH(p.name) + "</button><span>" + escH(extra || p.price) + "</span></div>";
    }

    function money(n) { return "$" + (Math.round(n * 100) / 100).toFixed(n % 1 ? 2 : 0); }
    function oneOff(p) { return /1\s*of\s*1/i.test(p.tag); }
    function checkoutUrl() { return store + "/cart/" + bag.map(function (x) { return x.v + ":" + x.qty; }).join(","); }
    function gotoCheckout() {
      var link = checkoutUrl();
      if (window.top !== window) window.open(link, "_blank", "noopener"); else location.href = link;
    }
    function cardsHtml(list) {
      return '<div class="qv-like-grid">' + list.map(function (x) {
        return '<button type="button" class="qv-card' + (x.sold ? " sold" : "") + '" data-pp="' + escH(x.slug) + '">' + (x.image ? '<img src="' + escH(x.image) + '" alt="" loading="lazy">' : "") + "<b>" + escH(x.name) + "</b><span>" + escH(x.sold ? "Claimed" : x.price) + "</span></button>";
      }).join("") + "</div>";
    }
    function all() { return order.map(function (id) { return index[id]; }); }

    // A full product page: gallery, options, bag, details, related and recently viewed
    function productPage(p) {
      var pics = [p.image].concat(p.images || []).filter(Boolean).filter(function (x, i, a) { return a.indexOf(x) === i; });
      var vs = p.variants || [];
      var named = vs.length > 1 || (vs[0] && / \/ /.test(vs[0][0]));
      var axes = named ? Math.max.apply(null, vs.map(function (v) { return v[0].split(" / ").length; })) : 0;
      var names = p.options && p.options.length === axes ? p.options : vs.length && axes === 1 ? [p.options[0] || "Option"] : [];
      for (var k = names.length; k < axes; k++) names.push("Option " + (k + 1));
      var parts = vs.map(function (v) { return v[0].split(" / ").map(function (x) { return x.trim(); }); });
      var first = vs.filter(function (v) { return !v[3]; })[0] || vs[0];
      var pick = first ? first[0].split(" / ").map(function (x) { return x.trim(); }) : [];
      seen = [p.id].concat(seen.filter(function (x) { return x !== p.id; })).slice(0, 12);
      save("seen", seen);
      var like = all().filter(function (x) { return x.id !== p.id && x.group === p.group && !x.sold; });
      like = like.concat(all().filter(function (x) { return x.id !== p.id && !x.sold && like.indexOf(x) < 0; })).slice(0, 8);
      var recent = seen.slice(1).map(function (id) { return index[id]; }).filter(Boolean).slice(0, 8);
      var detailRows = [["Category", p.group], ["Edition", p.tag], ["Serial", oneOff(p) && vs[0] && vs[0][0] ? vs[0][0] : ""]].filter(function (r) { return r[1]; });
      var shipping = String(site.shipping || "").split(/\n\s*\n/).filter(Boolean).map(function (x) { return "<p>" + escH(x).replace(/\n/g, "<br>") + "</p>"; }).join("");
      var opts = names.map(function (name, ax) {
        var vals = [];
        parts.forEach(function (pt) { if (pt[ax] && vals.indexOf(pt[ax]) < 0) vals.push(pt[ax]); });
        return '<div class="pp-opt"><div class="pp-opt-name">' + escH(name) + ': <b data-optv="' + ax + '"></b></div><div class="pp-vals">' +
          vals.map(function (v) { return '<button type="button" class="pp-val" data-ax="' + ax + '" data-v="' + escH(v) + '">' + escH(v.replace(/\s*\(\+\$\d+(\.\d+)?\)/, "")) + "</button>"; }).join("") + "</div></div>";
      }).join("");
      ppage.innerHTML = '<div class="wrap pp">' +
        '<nav class="crumbs" aria-label="Breadcrumb"><button type="button" class="pp-back">‹ Back</button><span>' + (p.group ? escH(p.group) + " › " : "") + escH(p.name) + "</span></nav>" +
        '<div class="pp-grid"><div class="pp-gallery"><div class="pp-main' + (p.sold ? " gone" : "") + '">' + (pics[0] ? '<img src="' + escH(pics[0]) + '" alt="' + escH(p.name) + '">' : "") + (p.sold ? '<span class="stamp">Claimed</span>' : "") +
          (pics.length > 1 ? '<button type="button" class="pp-nav prev" aria-label="Previous photo">‹</button><button type="button" class="pp-nav next" aria-label="Next photo">›</button>' : "") + "</div>" +
          (pics.length > 1 ? '<div class="pp-thumbs">' + pics.map(function (x, i) { return '<button type="button" class="qv-thumb' + (i ? "" : " on") + '" data-src="' + escH(x) + '" aria-label="Photo ' + (i + 1) + '"><img src="' + escH(x) + '" alt=""></button>'; }).join("") + "</div>" : "") + "</div>" +
        '<div class="pp-info">' + (p.tag ? '<span class="qv-tag">' + escH(p.tag) + "</span>" : "") + (p.group ? '<span class="qv-group">' + escH(p.group) + "</span>" : "") +
          "<h1>" + escH(p.name) + '</h1><div class="pp-price"><b class="pp-amt">' + escH(p.price) + '</b><span class="pp-stock"></span></div>' +
          (p.detail ? '<p class="pp-lead">' + escH(p.detail) + "</p>" : "") + opts +
          (!p.sold && vs.length && !oneOff(p) ? '<div class="pp-qty"><span>Quantity</span><div class="qty"><button type="button" data-pq="-1" aria-label="One less">−</button><span class="pp-n">1</span><button type="button" data-pq="1" aria-label="One more">+</button></div></div>' : "") +
          '<div class="pp-actions">' +
            (p.sold ? '<p class="qv-gone">This one’s been claimed. Its page stays up so you can see what you missed.</p>' :
              store && vs.length ? '<button type="button" class="btn btn-p btn-lg pp-add">Add to bag</button><button type="button" class="btn btn-o btn-lg pp-buy">Buy now</button>' :
              p.link ? '<a class="btn btn-p btn-lg" href="' + escH(p.link) + '" target="_blank" rel="noopener">Buy it here ↗</a>' : "") +
            '<button type="button" class="btn btn-grey btn-lg pp-fav" aria-pressed="' + isFav(p.id) + '">' + (isFav(p.id) ? "✓ In My List" : "+ My List") + "</button>" +
            '<button type="button" class="btn btn-grey btn-lg pp-share" aria-label="Share">Share</button></div>' +
          (site.perks && site.perks.length ? '<ul class="pp-perks">' + site.perks.map(function (x) { return "<li>" + escH(x) + "</li>"; }).join("") + "</ul>" : "") +
          '<details class="faq" open><summary>Description</summary><p>' + escH(p.description || p.detail || "") + "</p></details>" +
          (detailRows.length ? '<details class="faq"><summary>Details</summary><table class="kv">' + detailRows.map(function (r) { return "<tr><td>" + escH(r[0]) + "</td><td>" + escH(r[1]) + "</td></tr>"; }).join("") + "</table></details>" : "") +
          (shipping ? '<details class="faq"><summary>Shipping & returns</summary>' + shipping + "</details>" : "") +
        "</div></div>" +
        (like.length ? '<section class="pp-more"><h2>More like this</h2>' + cardsHtml(like) + "</section>" : "") +
        (recent.length ? '<section class="pp-more"><h2>Recently viewed</h2>' + cardsHtml(recent) + "</section>" : "") +
        "</div>" +
        (!p.sold && store && vs.length ? '<div class="pp-bar"><div><b>' + escH(p.name) + '</b><span class="pp-amt">' + escH(p.price) + '</span></div><button type="button" class="btn btn-p pp-add">Add to bag</button></div>' : "");

      var qty = 1, photo = 0;
      function chosen() {
        if (!vs.length) return null;
        if (!named) return vs[0];
        return vs.filter(function (v, i) { return parts[i].every(function (x, ax) { return x === pick[ax]; }); })[0] || null;
      }
      function refresh() {
        var v = chosen();
        names.forEach(function (n2, ax) {
          var label = ppage.querySelector('[data-optv="' + ax + '"]');
          if (label) label.textContent = pick[ax] || "";
          [].forEach.call(ppage.querySelectorAll('.pp-val[data-ax="' + ax + '"]'), function (b) {
            var val = b.getAttribute("data-v");
            var test = pick.slice(); test[ax] = val;
            var ok = vs.some(function (vv, i) { return !vv[3] && parts[i].every(function (x, a2) { return x === test[a2]; }); });
            b.classList.toggle("on", val === pick[ax]);
            b.classList.toggle("out", !ok);
          });
        });
        var price = v ? money(v[2]) : p.price, out = !v || v[3];
        [].forEach.call(ppage.querySelectorAll(".pp-amt"), function (x) { x.textContent = vs.length > 1 ? price : p.price; });
        var stock = ppage.querySelector(".pp-stock");
        stock.textContent = p.sold ? "Claimed" : !vs.length ? "" : out ? "Sold out in this option" : oneOff(p) ? "Only one exists · available now" : "In stock";
        stock.className = "pp-stock" + (p.sold || out ? " no" : "");
        [].forEach.call(ppage.querySelectorAll(".pp-add,.pp-buy"), function (b) { b.disabled = out; });
      }
      function setPhoto(i) {
        photo = (i + pics.length) % pics.length;
        ppage.querySelector(".pp-main img").src = pics[photo];
        [].forEach.call(ppage.querySelectorAll(".qv-thumb"), function (x, n) { x.classList.toggle("on", n === photo); });
      }
      ppage.onclick = function (e) {
        var t = e.target.closest("button");
        if (!t) return;
        if (t.classList.contains("pp-back")) back();
        else if (t.classList.contains("qv-thumb")) setPhoto([].indexOf.call(ppage.querySelectorAll(".qv-thumb"), t));
        else if (t.classList.contains("pp-nav")) setPhoto(photo + (t.classList.contains("next") ? 1 : -1));
        else if (t.classList.contains("pp-val")) { pick[+t.getAttribute("data-ax")] = t.getAttribute("data-v"); refresh(); }
        else if (t.hasAttribute("data-pq")) { qty = Math.max(1, Math.min(20, qty + +t.getAttribute("data-pq"))); ppage.querySelector(".pp-n").textContent = qty; }
        else if (t.classList.contains("pp-add")) { var v = chosen(); if (v && !v[3]) addToBag(p, v, qty); }
        else if (t.classList.contains("pp-buy")) { var v2 = chosen(); if (v2 && !v2[3]) { addToBag(p, v2, qty, true); gotoCheckout(); } }
        else if (t.classList.contains("pp-fav")) { toggleFav(p.id); t.textContent = isFav(p.id) ? "✓ In My List" : "+ My List"; t.setAttribute("aria-pressed", isFav(p.id)); }
        else if (t.classList.contains("pp-share")) {
          var link = location.href.split("#")[0] + "#/p/" + p.slug;
          if (navigator.share) navigator.share({ title: p.name, url: link }).catch(function () {});
          else if (navigator.clipboard) navigator.clipboard.writeText(link).then(function () { toast("Link copied"); }, function () { toast(link); });
          else toast(link);
        }
      };
      var main = ppage.querySelector(".pp-main"), sx = null;
      main.addEventListener("touchstart", function (e) { sx = e.touches[0].clientX; }, { passive: true });
      main.addEventListener("touchend", function (e) { if (sx === null || pics.length < 2) return; var dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 40) setPhoto(photo + (dx < 0 ? 1 : -1)); sx = null; });
      ppage.setAttribute("data-title", p.name);
      refresh();
      counts();
    }

    function openList() {
      var items = fav.map(function (id) { return index[id]; }).filter(Boolean);
      open("<h2>My List</h2>" + (items.length ? '<div class="sheet-list">' + items.map(function (p) {
        return '<div class="sheet-row">' + mini(p, p.sold ? "Claimed" : p.price) + '<button type="button" class="sheet-rm" data-unfav="' + escH(p.id) + '" aria-label="Remove ' + escH(p.name) + '">&times;</button></div>';
      }).join("") + "</div>" : '<p class="sheet-empty">Tap the heart on anything you like and it lands here.</p>'), "sheet");
    }
    function openBag() {
      var total = 0;
      var rows = bag.map(function (x, i) {
        var p = index[x.id];
        if (!p) return "";
        total += x.n * x.qty;
        var one = oneOff(p);
        return '<div class="sheet-row">' + mini(p, (x.label ? x.label + " · " : "") + money(x.n)) +
          '<div class="qty">' + (one ? "<span>1 of 1</span>" : '<button type="button" data-q="' + i + '" data-d="-1" aria-label="One less">−</button><span>' + x.qty + '</span><button type="button" data-q="' + i + '" data-d="1" aria-label="One more">+</button>') + "</div>" +
          '<button type="button" class="sheet-rm" data-rm="' + i + '" aria-label="Remove ' + escH(p.name) + '">&times;</button></div>';
      }).join("");
      var link = checkoutUrl();
      open("<h2>Your bag</h2>" + (bag.length ? '<div class="sheet-list">' + rows + '</div><div class="sheet-foot"><div class="sheet-total"><span>Subtotal</span><b>' + money(total) + '</b></div><p class="small">Shipping and any discounts are worked out at checkout. Free over $50 in Australia.</p>' +
        '<a class="btn btn-p btn-lg btn-block" href="' + escH(link) + '" target="_blank" rel="noopener">Checkout securely ↗</a></div>' : '<p class="sheet-empty">Your bag is empty. One-of-ones go fast.</p>'), "sheet");
    }
    function openSearch() {
      open('<div class="srch"><input type="search" class="srch-in" placeholder="Search ' + order.length + ' products…" aria-label="Search products"><div class="srch-res"></div></div>', "search");
      var input = layer.querySelector(".srch-in"), res = layer.querySelector(".srch-res");
      function run() {
        var q = input.value.trim().toLowerCase();
        var list = order.map(function (id) { return index[id]; }).filter(function (p) { return !q || (p.name + " " + p.group + " " + p.tag + " " + p.detail + " " + p.description).toLowerCase().indexOf(q) >= 0; });
        if (!q) list = list.filter(function (p) { return !p.sold; });
        res.innerHTML = (q ? "<h3>" + list.length + " result" + (list.length === 1 ? "" : "s") + "</h3>" : "<h3>Available now</h3>") + (list.length ? cardsHtml(list.slice(0, 40)) : '<p class="sheet-empty">Nothing matches that. Try "pink", "tray" or "socks".</p>');
      }
      input.addEventListener("input", run);
      run();
    }

    d.addEventListener("click", function (e) {
      var t = e.target;
      if (!t.closest) return;
      var opener = t.closest("[data-open]");
      if (opener) { var k = opener.getAttribute("data-open"); if (k === "search") openSearch(); else if (k === "list") openList(); else openBag(); return; }
      var favBtn = t.closest(".fav");
      if (favBtn) { var fp = product(favBtn); if (fp) toggleFav(fp.id); return; }
      var pp = t.closest("[data-pp]");
      if (pp && bySlug[pp.getAttribute("data-pp")]) { go("#/p/" + pp.getAttribute("data-pp"), true); return; }
      if (t.closest("[data-unfav]")) { toggleFav(t.closest("[data-unfav]").getAttribute("data-unfav")); openList(); return; }
      var q = t.closest("[data-q]");
      if (q) { var line = bag[+q.getAttribute("data-q")]; line.qty = Math.max(1, Math.min(20, line.qty + +q.getAttribute("data-d"))); save("bag", bag); counts(); openBag(); return; }
      if (t.closest("[data-rm]")) { bag.splice(+t.closest("[data-rm]").getAttribute("data-rm"), 1); save("bag", bag); counts(); openBag(); return; }
      // Clicking a product card opens its product page on this site
      var cover = t.closest(".pcover");
      if (cover && !e.metaKey && !e.ctrlKey && !e.shiftKey) { var cp = product(cover); if (cp) { e.preventDefault(); go("#/p/" + cp.slug, true); } }
    });
    if (!order.length) $$(".hdr-tools").forEach(function (x) { x.hidden = true; });
    counts();

    // ----- Start: open the linked page, then fade sections in as they scroll into view
    if (location.hash && location.hash.length > 1) go(location.hash, false); else mark(cur());
    rails();
    if ("IntersectionObserver" in window && !reduce) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add("in"); io.unobserve(x.target); } });
      }, { rootMargin: "0px 0px -6% 0px" });
      h.classList.add("anim");
      $$(".sec-head,.pcard,.sec .card,.tile,.media,.hero-copy,.phead .wrap,.signup .wrap,.cta .wrap,.stats-in>div,.row-head,.cd-in").forEach(function (el) { el.classList.add("rv"); io.observe(el); });
    }
  }
  var SITE_JS = "(" + siteScript.toString() + ")();";

  var EDIT_CSS = ".cine main>[data-block]:first-child>.bb{margin-top:-71px}[data-block]{position:relative;cursor:pointer}[data-block]:hover{outline:2px dashed rgba(212,173,58,.8);outline-offset:-2px}[data-block].sel{outline:3px solid #d4ad3a;outline-offset:-3px}[data-block].sel::before{content:attr(data-label);position:absolute;top:0;left:0;z-index:20;background:#d4ad3a;color:#1b1404;font:700 11px/1 system-ui;padding:5px 8px;letter-spacing:.06em;text-transform:uppercase}a,button{pointer-events:none}";
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
      "<style>" + themeCss(t) + BASE_CSS + (opts.editable ? EDIT_CSS : "") + (opts.banner ? ".draft-bar{position:sticky;top:0;z-index:60;background:#d4ad3a;color:#1b1404;font:600 13px/1.4 system-ui;text-align:center;padding:8px 14px}.draft-bar~.hdr{top:36px}" : "") + "</style></head><body id=\"top\"" + (t.look === "cinema" ? ' class="cine"' : "") + ' data-site="' + esc(slugify(t.business) || "site") + '"' + (/^https:\/\/[^\s"'<>]+$/i.test(t.store || "") ? ' data-store="' + esc(t.store) + '"' : "") + ">\n" + (opts.banner ? '<div class="draft-bar">' + esc(opts.banner) + "</div>" : "") + body + "\n" +
      (opts.editable ? "" : '<script type="application/json" id="site-data">' + JSON.stringify({ perks: lines(t.perks), shipping: String(t.shipping || "") }).replace(/</g, "\\u003c") + "</script>") +
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
