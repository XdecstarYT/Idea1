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
      ],
      defaults: function (t) { return { logo: t.business || "Your Business", links: [{ text: "Services", link: "#services" }, { text: "About", link: "#about" }, { text: "Contact", link: "#contact" }], cta: t.phone ? "Call " + t.phone : "Get a quote", ctaLink: "" }; },
      render: function (b, t) {
        return '<header class="hdr"><div class="wrap hdr-in"><a class="logo" href="#top">' + esc(b.logo || t.business) + "</a>" +
          '<nav class="menu">' + (b.links || []).map(function (l) { return '<a href="' + esc(url(l.link)) + '">' + esc(l.text) + "</a>"; }).join("") + "</nav>" +
          (b.cta ? '<a class="btn btn-p" href="' + esc(url(b.ctaLink, telLink(t.phone))) + '">' + esc(b.cta) + "</a>" : "") + "</div></header>";
      },
    },
    hero: {
      label: "Hero", icon: "★", desc: "Big headline and buttons",
      fields: [
        { key: "layout", label: "Layout", type: "select", options: [["centered", "Centred"], ["split", "Text + image"]] },
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
        { key: "items", label: "Products", type: "list", item: [{ key: "image", label: "Photo (https link)", type: "image" }, { key: "name", label: "Name", type: "text" }, { key: "detail", label: "Short description", type: "textarea" }, { key: "price", label: "Price", type: "text" }, { key: "tag", label: "Tag (e.g. New, 1 of 1)", type: "text" }, { key: "link", label: "Shop link", type: "text" }] },
        { key: "button", label: "Button below the grid", type: "text" },
        { key: "buttonLink", label: "Button link", type: "text" },
      ],
      defaults: function () { return { eyebrow: "", heading: "Shop", intro: "", columns: "4", items: [{ image: "", name: "Product one", detail: "", price: "$20", tag: "New", link: "" }, { image: "", name: "Product two", detail: "", price: "$30", tag: "", link: "" }, { image: "", name: "Product three", detail: "", price: "$40", tag: "", link: "" }, { image: "", name: "Product four", detail: "", price: "$50", tag: "", link: "" }], button: "", buttonLink: "" }; },
      render: function (b) {
        return '<section class="sec" id="' + esc(b.anchor || "shop") + '"><div class="wrap">' +
          (b.eyebrow ? '<span class="eyebrow">' + esc(b.eyebrow) + "</span>" : "") + head(b.heading, b.intro) +
          '<div class="pgrid c' + esc(b.columns || "4") + '">' + (b.items || []).map(function (i, n) {
            var href = url(i.link, "");
            var tagName = href ? "a" : "div";
            return "<" + tagName + ' class="pcard"' + (href ? ' href="' + esc(href) + '"' : "") + '><div class="pimg">' +
              (img(i.image) ? '<img src="' + esc(img(i.image)) + '" alt="' + esc(i.name) + '" loading="lazy">' : '<div class="ph" style="--h:' + (n * 61 % 360) + '">🛍</div>') +
              (i.tag ? '<span class="ptag">' + esc(i.tag) + "</span>" : "") + '</div><div class="pbody"><h3>' + esc(i.name) + "</h3>" +
              (i.detail ? "<p>" + esc(i.detail) + "</p>" : "") + '<div class="prow"><b>' + esc(i.price) + "</b>" + (href ? "<span>Shop →</span>" : "") + "</div></div></" + tagName + ">";
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
      ],
      defaults: function (t) { return { heading: "About " + (t.business || "us"), text: "Tell your story: how you started, what you care about, and why locals trust you.", points: "Locally owned\nFully licensed and insured\nHonest, upfront pricing", image: "", flip: false }; },
      render: function (b) {
        var points = lines(b.points);
        return '<section class="sec alt" id="about"><div class="wrap split' + (b.flip ? " flip" : "") + '"><div><h2>' + esc(b.heading) + "</h2><p class=\"lead\">" + esc(b.text).replace(/\n/g, "<br>") + "</p>" +
          (points.length ? '<ul class="ticks">' + points.map(function (p) { return "<li>" + esc(p) + "</li>"; }).join("") + "</ul>" : "") + "</div>" +
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
        { key: "items", label: "Questions", type: "list", item: [{ key: "q", label: "Question", type: "text" }, { key: "a", label: "Answer", type: "textarea" }] },
      ],
      defaults: function () { return { heading: "Questions", items: [{ q: "Do you offer free quotes?", a: "Yes. Get in touch and we'll get back to you the same day." }, { q: "What areas do you cover?", a: "Warrnambool and surrounding towns." }] }; },
      render: function (b) {
        return '<section class="sec alt" id="faq"><div class="wrap narrow">' + head(b.heading) + (b.items || []).map(function (i) {
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
    footer: {
      label: "Footer", icon: "▁", desc: "Copyright and contact line",
      fields: [{ key: "text", label: "Footer text", type: "textarea" }],
      defaults: function (t) { return { text: "© " + new Date().getFullYear() + " " + (t.business || "Your Business") + ". All rights reserved." }; },
      render: function (b, t) {
        return '<footer class="ftr"><div class="wrap ftr-in"><span>' + esc(b.text) + '</span><span class="credit">Website by Marshall Web Co.</span></div></footer>';
      },
    },
  };

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
    ".logo{font-family:var(--fh);font-weight:800;font-size:1.25rem;text-decoration:none}.menu{display:flex;gap:22px}.menu a{text-decoration:none;font-weight:600;color:var(--muted)}.menu a:hover{color:var(--fg)}@media(max-width:760px){.menu{display:none}.hdr .btn{padding:10px 14px;font-size:.9rem}}",
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
  ].join("");

  var EDIT_CSS = "[data-block]{position:relative;cursor:pointer}[data-block]:hover{outline:2px dashed rgba(212,173,58,.8);outline-offset:-2px}[data-block].sel{outline:3px solid #d4ad3a;outline-offset:-3px}[data-block].sel::before{content:attr(data-label);position:absolute;top:0;left:0;z-index:20;background:#d4ad3a;color:#1b1404;font:700 11px/1 system-ui;padding:5px 8px;letter-spacing:.06em;text-transform:uppercase}a,button{pointer-events:none}";
  var EDIT_JS = "document.addEventListener('click',function(e){var b=e.target.closest('[data-block]');if(b){e.preventDefault();parent.postMessage({mwcSelect:b.getAttribute('data-block')},'*')}},true);" +
    "window.addEventListener('message',function(e){if(!e.data||!e.data.mwcHighlight)return;document.querySelectorAll('[data-block]').forEach(function(x){x.classList.toggle('sel',x.getAttribute('data-block')===e.data.mwcHighlight)});var s=document.querySelector('[data-block].sel');if(s&&e.data.scroll)s.scrollIntoView({block:'nearest',behavior:'smooth'})});";

  function renderSite(design, opts) {
    opts = opts || {};
    var t = (design && design.theme) || {};
    var blocks = (design && design.blocks) || [];
    var f = FONTS[t.font] || FONTS.modern;
    var body = blocks.filter(function (b) { return BLOCKS[b.type] && !b.hidden; }).map(function (b) {
      var html = BLOCKS[b.type].render(b, t);
      return opts.editable ? '<div data-block="' + esc(b.id) + '" data-label="' + esc(BLOCKS[b.type].label) + '"' + (b.id === opts.selected ? ' class="sel"' : "") + ">" + html + "</div>" : html;
    }).join("\n");
    if (!body) body = '<div style="padding:120px 20px;text-align:center;color:#888;font-family:system-ui">Add a section to get started.</div>';
    return "<!doctype html>\n<html lang=\"en-AU\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">" +
      "<title>" + esc(t.business || "Website") + "</title>" + (opts.noindex ? '<meta name="robots" content="noindex">' : "") + (t.description ? '<meta name="description" content="' + esc(t.description) + '">' : "") +
      '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
      '<link href="https://fonts.googleapis.com/css2?family=' + f.css + '&display=swap" rel="stylesheet">' +
      "<style>" + themeCss(t) + BASE_CSS + (opts.editable ? EDIT_CSS : "") + (opts.banner ? ".draft-bar{position:sticky;top:0;z-index:50;background:#d4ad3a;color:#1b1404;font:600 13px/1.4 system-ui;text-align:center;padding:8px 14px}.draft-bar~.hdr{top:36px}" : "") + "</style></head><body id=\"top\">\n" + (opts.banner ? '<div class="draft-bar">' + esc(opts.banner) + "</div>" : "") + body + "\n" +
      (opts.editable ? "<script>" + EDIT_JS + "</script>" : "") + "</body></html>";
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

  return { BLOCKS: BLOCKS, FONTS: FONTS, RADIUS: RADIUS, renderSite: renderSite, newBlock: newBlock, template: template, esc: esc, uid: uid };
});
