// Site builder: edit a design's sections and theme with a live preview, autosave to Supabase,
// export HTML and send the design to the client for review.

(function () {
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var B = window.MWCBuilder;
  var esc = B.esc;
  var cfg = window.MWC_CONFIG;

  function show(id) { ["loading", "gate", "bld"].forEach(function (v) { document.getElementById(v).hidden = v !== id; }); }
  function gate(msg) { $("#gate-msg").textContent = msg; show("gate"); }
  function toast(message, kind) {
    var el = document.createElement("div");
    el.className = "glass toast-msg " + (kind || "ok");
    el.textContent = message;
    $("#toasts").appendChild(el);
    setTimeout(function () { el.remove(); }, 3800);
  }

  if (!window.supabase) { gate("Couldn't load the sign-in service. Check your connection and refresh."); return; }
  var sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, { auth: { persistSession: true, autoRefreshToken: true, storageKey: "mwc-auth" } });
  var designId = new URLSearchParams(location.search).get("id");

  var state = { me: null, design: null, content: null, client: null, site: null, selected: null, page: 0, undo: [], redo: [], lastSnap: "", dirty: false };

  // ---------- Load ----------
  sb.auth.getSession().then(function (res) {
    var session = res.data && res.data.session;
    if (!session) return gate("Sign in as the owner to use the builder.");
    state.me = session.user;
    return sb.from("admins").select("user_id").eq("user_id", session.user.id).maybeSingle().then(function (a) {
      if (!a.data) return gate("Only the owner can use the builder.");
      if (!designId) return gate("No design selected. Open the builder from the owner panel's Designs section.");
      return sb.from("designs").select("*").eq("id", designId).maybeSingle().then(function (d) {
        if (!d.data) return gate("That design couldn't be found.");
        state.design = d.data;
        state.content = normalise(d.data.content);
        state.lastSnap = JSON.stringify(state.content);
        var none = Promise.resolve({ data: null });
        return Promise.all([
          d.data.client_id ? sb.from("profiles").select("*").eq("id", d.data.client_id).maybeSingle() : none,
          d.data.site_id ? sb.from("sites").select("*").eq("id", d.data.site_id).maybeSingle() : none,
        ]).then(function (r) {
          state.client = r[0].data || {};
          state.site = r[1].data || {};
          start();
        });
      });
    });
  }).catch(function () { gate("Couldn't reach the server. Check your connection and refresh."); });

  function normalise(c) {
    var withIds = function (list) { list.forEach(function (b) { if (!b.id) b.id = B.uid(); }); return list; };
    if (c && Array.isArray(c.pages) && c.pages.length) {
      c.theme = c.theme || {};
      c.shared = withIds(Array.isArray(c.shared) ? c.shared : []);
      c.pages.forEach(function (p, i) {
        p.id = p.id || B.uid();
        p.title = p.title || "Page " + (i + 1);
        p.slug = B.slugify(p.slug || p.title) || "page-" + (i + 1);
        p.blocks = withIds(Array.isArray(p.blocks) ? p.blocks : []);
      });
      delete c.blocks;
      return c;
    }
    if (!c || !Array.isArray(c.blocks)) return B.template("blank", {});
    c.theme = c.theme || {};
    withIds(c.blocks);
    return c;
  }

  // ---------- Pages ----------
  function multi() { return Array.isArray(state.content.pages) && state.content.pages.length > 0; }
  function curPage() {
    if (!multi()) return null;
    state.page = Math.max(0, Math.min(state.page, state.content.pages.length - 1));
    return state.content.pages[state.page];
  }
  // The section list a block lives in: "shared" (every page), "page" (the current page) or the single-page list
  function listFor(name) { return !multi() ? state.content.blocks : name === "shared" ? state.content.shared : curPage().blocks; }
  function allBlocks() {
    if (!multi()) return state.content.blocks;
    return state.content.pages.reduce(function (all, p) { return all.concat(p.blocks); }, state.content.shared.slice());
  }
  function listNameOf(id) {
    if (!multi()) return "page";
    return state.content.shared.some(function (b) { return b.id === id; }) ? "shared" : "page";
  }

  // Turn a one-page design into a site with pages. Leading headers/banners and the footer become shared.
  function makeMulti() {
    var blocks = state.content.blocks || [];
    var shared = [], i = 0;
    while (i < blocks.length && B.TOP_TYPES[blocks[i].type]) shared.push(blocks[i++]);
    var rest = blocks.slice(i);
    var tail = [];
    while (rest.length && rest[rest.length - 1].type === "footer") tail.unshift(rest.pop());
    shared = shared.concat(tail);
    shared.forEach(function (b) { if (b.type === "header") b.auto = true; });
    state.content.shared = shared;
    state.content.pages = [{ id: B.uid(), title: "Home", slug: "home", blocks: rest }];
    delete state.content.blocks;
  }

  function addPage(title) {
    if (!multi()) makeMulti();
    var pages = state.content.pages;
    var slug = B.slugify(title) || "page";
    var taken = pages.map(function (p) { return p.slug; });
    var n = 2, base = slug;
    while (taken.indexOf(slug) >= 0) slug = base + "-" + n++;
    var head = B.newBlock("pagehead", state.content.theme);
    head.heading = title;
    pages.push({ id: B.uid(), title: title, slug: slug, blocks: [head] });
    state.page = pages.length - 1;
    state.selected = head.id;
  }

  function renderPages() {
    var on = multi();
    $("#page-bar").hidden = !on;
    $("#add-where").hidden = !on;
    $("#pages-intro").textContent = on
      ? "Each page has its own sections. Link to a page with #/its-link-name (e.g. #/" + state.content.pages[Math.min(1, state.content.pages.length - 1)].slug + "). Menus fill in automatically."
      : "This design is a single page. Add a page to turn it into a full website: your header and footer will show on every page.";
    if (!on) { $("#page-list").innerHTML = ""; return; }
    var cur = curPage();
    $("#page-select").innerHTML = state.content.pages.map(function (p, i) { return '<option value="' + i + '"' + (p === cur ? " selected" : "") + ">" + esc(p.title) + " (" + p.blocks.length + ")</option>"; }).join("");
    $("#page-list").innerHTML = state.content.pages.map(function (p, i) {
      return '<li class="page-item' + (p === cur ? " sel" : "") + '" data-i="' + i + '">' +
        '<div class="pi-top"><input data-pfield="title" value="' + esc(p.title) + '" maxlength="40" aria-label="Page name">' + (i === 0 ? '<span class="status-pill live">Home</span>' : "") + "</div>" +
        '<div class="pi-slug">#/<input data-pfield="slug" value="' + esc(p.slug) + '" maxlength="40" aria-label="Link name"></div>' +
        '<div class="pi-actions"><button type="button" data-pact="edit">Edit</button><button type="button" data-pact="up" aria-label="Move up">↑</button><button type="button" data-pact="down" aria-label="Move down">↓</button>' +
        (state.content.pages.length > 1 ? '<button type="button" data-pact="del" aria-label="Delete page">✕</button>' : "") +
        (i > 0 ? '<label class="switch"><input type="checkbox" data-pfield="hideInMenu"' + (p.hideInMenu ? " checked" : "") + '><span class="track"></span>Hide in menu</label>' : "") + "</div></li>";
    }).join("");
  }

  function goPage(i) {
    state.page = i;
    state.selected = null;
    renderPages(); renderList(); renderInspector(); renderPreview();
  }
  $("#page-select").addEventListener("change", function (e) { goPage(+e.target.value); });
  $("#page-add").addEventListener("submit", function (e) {
    e.preventDefault();
    var title = $("#page-new").value.trim();
    if (!title) return $("#page-new").focus();
    addPage(title);
    $("#page-new").value = "";
    changed(true);
    toast("Added the " + title + " page");
  });
  $("#page-list").addEventListener("click", function (e) {
    var item = e.target.closest(".page-item");
    var act = e.target.dataset && e.target.dataset.pact;
    if (!item || !act) return;
    var i = +item.dataset.i, pages = state.content.pages;
    if (act === "edit") { goPage(i); $('[data-pane-tab="sections"]').click(); return; }
    if (act === "up" && i > 0) { pages.splice(i - 1, 0, pages.splice(i, 1)[0]); state.page = i - 1; }
    else if (act === "down" && i < pages.length - 1) { pages.splice(i + 1, 0, pages.splice(i, 1)[0]); state.page = i + 1; }
    else if (act === "del") {
      if (!confirm('Delete the "' + pages[i].title + '" page and its ' + pages[i].blocks.length + " sections?")) return;
      pages.splice(i, 1);
      if (state.selected && !getBlock(state.selected)) state.selected = null;
      state.page = Math.min(state.page, pages.length - 1);
    } else return;
    changed(true);
  });
  $("#page-list").addEventListener("input", function (e) {
    var item = e.target.closest(".page-item");
    var field = e.target.dataset.pfield;
    if (!item || !field) return;
    var p = state.content.pages[+item.dataset.i];
    if (field === "hideInMenu") p.hideInMenu = e.target.checked;
    else if (field === "slug") p.slug = B.slugify(e.target.value) || p.slug;
    else p.title = e.target.value;
    changed(false);
  });
  $("#page-list").addEventListener("focusout", function (e) {
    if (e.target.dataset && e.target.dataset.pfield === "slug") renderPages();
  });

  function start() {
    show("bld");
    $("#design-name").value = state.design.name;
    $("#design-for").textContent = state.design.client_id
      ? "For " + (state.client.full_name || state.client.email || "client") + " · " + (state.site.name || "website")
      : "For " + (state.design.prospect_name || "a prospect") + " · share by link";
    renderStatus();
    renderPages();
    renderList();
    renderTheme();
    renderInspector();
    renderPreview();
    updateHistoryButtons();
  }

  // ---------- Status ----------
  var STATUS = { draft: "Draft", in_review: "With client", approved: "Approved", changes_requested: "Changes requested" };
  var PILL = { draft: "paused", in_review: "review", approved: "live", changes_requested: "open" };
  function renderStatus() {
    var s = state.design.status;
    var pill = $("#design-status");
    pill.className = "status-pill " + PILL[s];
    pill.textContent = STATUS[s];
    $("#send").textContent = s === "draft" ? "Send to client" : "Re-send to client";
  }

  // ---------- Section list ----------
  function summary(b) {
    var text = b.heading || b.logo || b.text || (b.items && b.items[0] && (b.items[0].title || b.items[0].name || b.items[0].q || b.items[0].value)) || "";
    return String(text).replace(/\s+/g, " ").slice(0, 60);
  }

  function renderList() {
    var list = $("#block-list");
    if (!multi()) { list.innerHTML = state.content.blocks.map(function (b, i) { return itemHtml(b, i, "page"); }).join(""); return; }
    var shared = state.content.shared, page = curPage();
    var top = [], bottom = [];
    shared.forEach(function (b, i) { (B.TOP_TYPES[b.type] ? top : bottom).push(itemHtml(b, i, "shared")); });
    list.innerHTML = (top.length ? '<li class="bl-group">Every page · top</li>' + top.join("") : "") +
      '<li class="bl-group">' + esc(page.title) + " page</li>" + (page.blocks.length ? page.blocks.map(function (b, i) { return itemHtml(b, i, "page"); }).join("") : '<li class="hint" style="list-style:none;padding:6px 4px">No sections on this page yet.</li>') +
      (bottom.length ? '<li class="bl-group">Every page · bottom</li>' + bottom.join("") : "");
  }
  function itemHtml(b, i, listName) {
      var def = B.BLOCKS[b.type] || { label: b.type, icon: "?" };
      return '<li class="block-item' + (b.id === state.selected ? " sel" : "") + (b.hidden ? " hidden-block" : "") + '" draggable="true" data-id="' + esc(b.id) + '" data-i="' + i + '" data-list="' + listName + '">' +
        '<span class="bi-icon">' + esc(def.icon) + '</span><span class="bi-text"><b>' + esc(def.label) + "</b><span>" + esc(summary(b) || def.desc) + "</span></span>" +
        '<span class="bi-actions">' +
          '<button type="button" data-act="up" title="Move up" aria-label="Move up">↑</button>' +
          '<button type="button" data-act="down" title="Move down" aria-label="Move down">↓</button>' +
          '<button type="button" data-act="dup" title="Duplicate" aria-label="Duplicate">⧉</button>' +
          '<button type="button" data-act="hide" title="' + (b.hidden ? "Show" : "Hide") + '" aria-label="' + (b.hidden ? "Show" : "Hide") + '">' + (b.hidden ? "◌" : "◉") + "</button>" +
          '<button type="button" data-act="del" title="Delete" aria-label="Delete">✕</button>' +
        "</span></li>";
  }

  $("#block-list").addEventListener("click", function (e) {
    var item = e.target.closest(".block-item");
    if (!item) return;
    var i = +item.dataset.i;
    var blocks = listFor(item.dataset.list);
    var act = e.target.dataset && e.target.dataset.act;
    if (!act) { select(item.dataset.id, true); return; }
    if (act === "up" && i > 0) blocks.splice(i - 1, 0, blocks.splice(i, 1)[0]);
    else if (act === "down" && i < blocks.length - 1) blocks.splice(i + 1, 0, blocks.splice(i, 1)[0]);
    else if (act === "dup") { var copy = JSON.parse(JSON.stringify(blocks[i])); copy.id = B.uid(); blocks.splice(i + 1, 0, copy); state.selected = copy.id; }
    else if (act === "hide") blocks[i].hidden = !blocks[i].hidden;
    else if (act === "del") {
      if (!confirm("Delete this " + (B.BLOCKS[blocks[i].type] || {}).label + " section?")) return;
      if (blocks[i].id === state.selected) state.selected = null;
      blocks.splice(i, 1);
    } else return;
    changed(true);
  });

  // Drag to reorder
  var dragFrom = null, dragList = null;
  $("#block-list").addEventListener("dragstart", function (e) { var it = e.target.closest(".block-item"); if (it) { dragFrom = +it.dataset.i; dragList = it.dataset.list; e.dataTransfer.effectAllowed = "move"; } });
  $("#block-list").addEventListener("dragover", function (e) {
    var it = e.target.closest(".block-item");
    if (!it || dragFrom === null || it.dataset.list !== dragList) return;
    e.preventDefault();
    $$(".block-item").forEach(function (x) { x.classList.toggle("drag-over", x === it); });
  });
  $("#block-list").addEventListener("drop", function (e) {
    var it = e.target.closest(".block-item");
    if (!it || dragFrom === null || it.dataset.list !== dragList) return;
    e.preventDefault();
    var to = +it.dataset.i;
    var blocks = listFor(dragList);
    blocks.splice(to, 0, blocks.splice(dragFrom, 1)[0]);
    dragFrom = null;
    changed(true);
  });
  $("#block-list").addEventListener("dragend", function () { dragFrom = null; $$(".block-item").forEach(function (x) { x.classList.remove("drag-over"); }); });

  // Add section
  var addDialog = $("#add-dialog");
  $("#type-grid").innerHTML = Object.keys(B.BLOCKS).map(function (k) {
    var d = B.BLOCKS[k];
    return '<button type="button" class="type-card" data-type="' + k + '"><span class="ti">' + esc(d.icon) + "</span><b>" + esc(d.label) + "</b><span>" + esc(d.desc) + "</span></button>";
  }).join("");
  $("#add-section").addEventListener("click", function () {
    $("#add-shared").checked = !!state.selected && listNameOf(state.selected) === "shared";
    addDialog.showModal();
  });
  $("#type-grid").addEventListener("click", function (e) {
    var card = e.target.closest("[data-type]");
    if (!card) return;
    var block = B.newBlock(card.dataset.type, state.content.theme);
    var blocks = listFor(multi() && $("#add-shared").checked ? "shared" : "page");
    // Insert after the selected section (if it's in the same list), or before the footer
    var selAt = state.selected ? blocks.findIndex(function (b) { return b.id === state.selected; }) : -1;
    var at = selAt >= 0 ? selAt + 1 : blocks.findIndex(function (b) { return b.type === "footer"; });
    if (at < 0) at = blocks.length;
    blocks.splice(at, 0, block);
    state.selected = block.id;
    addDialog.close();
    changed(true);
    postHighlight(true);
  });
  $$("dialog [data-close]").forEach(function (b) { b.addEventListener("click", function () { b.closest("dialog").close(); }); });

  // ---------- Inspector ----------
  function getBlock(id) { return allBlocks().find(function (b) { return b.id === id; }); }

  function fieldHtml(f, value, path) {
    var id = "f-" + path.replace(/\./g, "-");
    var common = 'id="' + id + '" data-path="' + path + '"';
    if (f.type === "textarea") return '<div><label for="' + id + '">' + esc(f.label) + "</label><textarea " + common + ">" + esc(value) + "</textarea>" + (f.hint ? '<p class="hint">' + esc(f.hint) + "</p>" : "") + "</div>";
    if (f.type === "select") return '<div><label for="' + id + '">' + esc(f.label) + "</label><select " + common + ">" + f.options.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === value ? " selected" : "") + ">" + esc(o[1]) + "</option>"; }).join("") + "</select></div>";
    if (f.type === "toggle") return '<label class="switch"><input type="checkbox" ' + common + (value ? " checked" : "") + '><span class="track"></span>' + esc(f.label) + "</label>";
    if (f.type === "image") {
      var ok = /^https:\/\//i.test(value || "");
      return '<div><label for="' + id + '">' + esc(f.label) + '</label><div class="img-field">' + (ok ? '<img src="' + esc(value) + '" alt="">' : '<span class="no-img">None</span>') +
        "<input " + common + ' type="url" placeholder="https://…" value="' + esc(value) + '"></div><p class="hint">Paste an image link (https). Leave empty for a placeholder.</p></div>';
    }
    if (f.type === "list") {
      var items = value || [];
      return '<div class="list-field"><label>' + esc(f.label) + "</label>" + items.map(function (it, n) {
        return '<div class="list-item"><div class="li-head">#' + (n + 1) + '<div><button type="button" data-list="' + path + '" data-op="up" data-n="' + n + '" aria-label="Move up">↑</button><button type="button" data-list="' + path + '" data-op="down" data-n="' + n + '" aria-label="Move down">↓</button><button type="button" data-list="' + path + '" data-op="del" data-n="' + n + '" aria-label="Remove">✕</button></div></div>' +
          f.item.map(function (sub) { return fieldHtml(sub, it[sub.key], path + "." + n + "." + sub.key); }).join("") + "</div>";
      }).join("") + '<button type="button" class="btn btn-glass btn-sm" data-list="' + path + '" data-op="add">+ Add</button></div>';
    }
    return '<div><label for="' + id + '">' + esc(f.label) + "</label><input " + common + ' value="' + esc(value) + '">' + (f.hint ? '<p class="hint">' + esc(f.hint) + "</p>" : "") + "</div>";
  }

  function feedbackBanner() {
    var d = state.design;
    if (d.status === "changes_requested") return '<div class="feedback-banner changes"><b>Client asked for changes</b>' + esc(d.client_feedback || "(no details)") + "</div>";
    if (d.status === "approved") return '<div class="feedback-banner approved"><b>Approved by the client 🎉</b>' + esc(d.client_feedback || "") + "</div>";
    if (d.status === "in_review") return '<div class="feedback-banner review"><b>With the client for review</b>They see changes as soon as they\'re saved.</div>';
    return "";
  }

  function renderInspector() {
    var el = $("#inspector");
    var b = state.selected && getBlock(state.selected);
    if (!b) {
      el.innerHTML = feedbackBanner() + '<div class="insp-empty"><b>Select a section</b>Click any part of the preview, or a section on the left, to edit its words, images and layout.</div>';
      return;
    }
    var def = B.BLOCKS[b.type];
    el.innerHTML = feedbackBanner() + '<div class="insp-head"><span class="bi-icon" style="width:36px;height:36px;border-radius:10px;display:grid;place-items:center;background:rgba(255,255,255,.08)">' + esc(def.icon) + "</span><h2>" + esc(def.label) + '</h2><button class="icon-btn" type="button" id="deselect" aria-label="Close">✕</button></div>' +
      (multi() && listNameOf(b.id) === "shared" ? '<p class="hint" style="margin:0 0 12px">Shows on every page.</p>' : "") +
      '<form class="insp" onsubmit="return false">' + def.fields.filter(function (f) { return multi() || !(b.type === "header" && f.key === "auto"); }).map(function (f) { return fieldHtml(f, b[f.key], f.key); }).join("") + "</form>";
    $("#deselect").addEventListener("click", function () { select(null); });
  }

  function setPath(obj, path, value) {
    var parts = path.split(".");
    var last = parts.pop();
    parts.forEach(function (p) { obj = obj[p]; });
    obj[last] = value;
  }

  $("#inspector").addEventListener("input", function (e) {
    var path = e.target.dataset && e.target.dataset.path;
    var b = state.selected && getBlock(state.selected);
    if (!path || !b) return;
    setPath(b, path, e.target.type === "checkbox" ? e.target.checked : e.target.value);
    if (e.target.type === "url") {
      var holder = e.target.parentNode.firstElementChild;
      var ok = /^https:\/\//i.test(e.target.value);
      if (ok && holder.tagName === "IMG") holder.src = e.target.value;
      else holder.outerHTML = ok ? '<img src="' + esc(e.target.value) + '" alt="">' : '<span class="no-img">None</span>';
    }
    changed(false);
  });

  $("#inspector").addEventListener("click", function (e) {
    var btn = e.target.closest("[data-list]");
    var b = state.selected && getBlock(state.selected);
    if (!btn || !b) return;
    var path = btn.dataset.list.split(".");
    var holder = b, key = path.pop();
    path.forEach(function (p) { holder = holder[p]; });
    var arr = holder[key] = holder[key] || [];
    var n = +btn.dataset.n;
    var field = findField(B.BLOCKS[b.type].fields, btn.dataset.list);
    if (btn.dataset.op === "add") {
      var blank = {};
      (field ? field.item : []).forEach(function (f) { blank[f.key] = f.type === "toggle" ? false : ""; });
      arr.push(blank);
    } else if (btn.dataset.op === "del") arr.splice(n, 1);
    else if (btn.dataset.op === "up" && n > 0) arr.splice(n - 1, 0, arr.splice(n, 1)[0]);
    else if (btn.dataset.op === "down" && n < arr.length - 1) arr.splice(n + 1, 0, arr.splice(n, 1)[0]);
    changed(true);
  });

  function findField(fields, path) {
    var key = path.split(".")[0];
    return fields.find(function (f) { return f.key === key; });
  }

  // ---------- Theme ----------
  var THEME_FIELDS = [
    { key: "business", label: "Business name", type: "text" },
    { key: "phone", label: "Phone", type: "text" },
    { key: "email", label: "Email", type: "text" },
    { key: "description", label: "Google description", type: "textarea" },
    { key: "primary", label: "Main colour", type: "color" },
    { key: "accent", label: "Second colour", type: "color" },
    { key: "mode", label: "Background", type: "select", options: [["light", "Light"], ["dark", "Dark"]] },
    { key: "font", label: "Font style", type: "select", options: Object.keys(B.FONTS).map(function (k) { return [k, B.FONTS[k].label]; }) },
    { key: "radius", label: "Corners", type: "select", options: [["sharp", "Sharp"], ["soft", "Soft"], ["round", "Round"]] },
    { key: "look", label: "Look", type: "select", options: [["standard", "Standard"], ["cinema", "Cinema (deep blacks, glass header)"]] },
    { key: "perks", label: "Product page perks (one per line)", type: "textarea", hint: "Shown on every product page, e.g. Free shipping over $50" },
    { key: "shipping", label: "Shipping & returns (product pages)", type: "textarea" },
    { key: "store", label: "Online store link (for the shopping bag)", type: "text", hint: "A Shopify store address, e.g. https://yourstore.com. Products with bag options can then be added to a bag and checked out there." },
  ];
  function renderTheme() {
    var t = state.content.theme;
    $("#theme-form").innerHTML = THEME_FIELDS.map(function (f) {
      if (f.type === "color") return '<div><label for="t-' + f.key + '">' + f.label + '</label><div class="color-field"><input type="color" id="t-' + f.key + '" data-theme="' + f.key + '" value="' + esc(t[f.key] || "#2e9e5b") + '"><input data-theme="' + f.key + '" value="' + esc(t[f.key] || "") + '" aria-label="' + f.label + ' hex code"></div></div>';
      return fieldHtml(f, t[f.key], "theme." + f.key).replace('data-path="theme.' + f.key + '"', 'data-theme="' + f.key + '"');
    }).join("") + '<p class="hint">Theme changes apply to every section.</p>';
  }
  $("#theme-form").addEventListener("input", function (e) {
    var key = e.target.dataset.theme;
    if (!key) return;
    state.content.theme[key] = e.target.value;
    if (e.target.type === "color") e.target.nextElementSibling.value = e.target.value;
    else if (/^#[0-9a-f]{6}$/i.test(e.target.value) && e.target.previousElementSibling && e.target.previousElementSibling.type === "color") e.target.previousElementSibling.value = e.target.value;
    changed(false);
  });
  $$("[data-pane-tab]").forEach(function (b) {
    b.addEventListener("click", function () {
      $$("[data-pane-tab]").forEach(function (x) { x.setAttribute("aria-pressed", x === b); });
      $$("[data-pane-body]").forEach(function (p) { p.hidden = p.dataset.paneBody !== b.dataset.paneTab; });
    });
  });

  // ---------- Preview ----------
  var frame = $("#frame");
  var previewTimer = null;
  function renderPreview() {
    var y = 0;
    try { y = frame.contentWindow.scrollY; } catch (e) { /* not loaded yet */ }
    frame.onload = function () { try { frame.contentWindow.scrollTo(0, y); } catch (e) { /* ignore */ } };
    var page = curPage();
    frame.srcdoc = B.renderSite(state.content, { editable: true, selected: state.selected, page: page && page.id });
  }
  function postHighlight(scroll) {
    try { frame.contentWindow.postMessage({ mwcHighlight: state.selected || "none", scroll: !!scroll }, "*"); } catch (e) { /* ignore */ }
  }
  window.addEventListener("message", function (e) {
    if (e.source !== frame.contentWindow || !e.data || !e.data.mwcSelect) return;
    select(e.data.mwcSelect, false);
  });
  function select(id, scroll) {
    state.selected = id;
    $$(".block-item").forEach(function (x) { x.classList.toggle("sel", x.dataset.id === id); });
    var item = id && $('.block-item[data-id="' + id + '"]');
    if (item) item.scrollIntoView({ block: "nearest" });
    renderInspector();
    postHighlight(scroll);
  }
  $$(".devices button").forEach(function (b) {
    b.addEventListener("click", function () {
      $$(".devices button").forEach(function (x) { x.setAttribute("aria-pressed", x === b); });
      $("#frame-wrap").dataset.device = b.dataset.device;
    });
  });

  // ---------- Changes, history and autosave ----------
  var saveTimer = null, snapTimer = null;
  function changed(structural) {
    state.dirty = true;
    $("#save-state").textContent = "Unsaved";
    $("#save-state").className = "save-state dirty";
    if (structural) { renderPages(); renderList(); renderInspector(); renderPreview(); snapshot(); }
    else {
      clearTimeout(previewTimer);
      previewTimer = setTimeout(function () { renderPreview(); renderList(); if (multi()) $("#page-select").innerHTML = state.content.pages.map(function (p, i) { return '<option value="' + i + '"' + (i === state.page ? " selected" : "") + ">" + esc(p.title) + " (" + p.blocks.length + ")</option>"; }).join(""); }, 180);
      clearTimeout(snapTimer);
      snapTimer = setTimeout(snapshot, 500);
    }
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 1200);
  }

  function snapshot() {
    var now = JSON.stringify(state.content);
    if (now === state.lastSnap) return;
    state.undo.push(state.lastSnap);
    if (state.undo.length > 80) state.undo.shift();
    state.redo = [];
    state.lastSnap = now;
    updateHistoryButtons();
  }
  function restore(snap) {
    state.content = JSON.parse(snap);
    state.lastSnap = snap;
    if (state.selected && !getBlock(state.selected)) state.selected = null;
    renderPages(); renderList(); renderTheme(); renderInspector(); renderPreview(); updateHistoryButtons();
    state.dirty = true;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 800);
  }
  function undo() { clearTimeout(snapTimer); snapshot(); if (!state.undo.length) return; state.redo.push(state.lastSnap); restore(state.undo.pop()); }
  function redo() { if (!state.redo.length) return; state.undo.push(state.lastSnap); restore(state.redo.pop()); }
  function updateHistoryButtons() { $("#undo").disabled = !state.undo.length; $("#redo").disabled = !state.redo.length; }
  $("#undo").addEventListener("click", undo);
  $("#redo").addEventListener("click", redo);
  document.addEventListener("keydown", function (e) {
    var typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
    if (!(e.ctrlKey || e.metaKey) || typing) return;
    var k = e.key.toLowerCase();
    if (k === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
    else if ((k === "z" && e.shiftKey) || k === "y") { e.preventDefault(); redo(); }
    else if (k === "s") { e.preventDefault(); save(); }
  });

  function save() {
    clearTimeout(saveTimer);
    var name = $("#design-name").value.trim() || "Homepage";
    $("#save-state").textContent = "Saving…";
    return sb.from("designs").update({ content: state.content, name: name }).eq("id", designId).then(function (res) {
      if (res.error) { $("#save-state").textContent = "Not saved"; toast("Couldn't save: " + res.error.message, "err"); return false; }
      state.design.name = name;
      state.dirty = false;
      $("#save-state").textContent = "Saved";
      $("#save-state").className = "save-state";
      return true;
    });
  }
  $("#design-name").addEventListener("input", function () { changed(false); });
  window.addEventListener("beforeunload", function (e) { if (state.dirty) { e.preventDefault(); e.returnValue = ""; } });

  // ---------- Preview, export, send ----------
  $("#open-preview").addEventListener("click", function () {
    var blob = new Blob([B.renderSite(state.content)], { type: "text/html" });
    window.open(URL.createObjectURL(blob), "_blank", "noopener");
  });
  $("#export").addEventListener("click", function () {
    var a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([B.renderSite(state.content)], { type: "text/html" }));
    a.download = (state.content.theme.business || "website").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + ".html";
    a.click();
    toast("Exported. Rename it index.html and drag it into Netlify to publish.");
  });

  var sendDialog = $("#send-dialog");
  function shareLink() {
    sendDialog.close();
    save().then(function () {
      window.MWCShare.open({ sb: sb, design: Object.assign(state.design, { content: state.content }), toast: toast, onChange: function () { renderStatus(); renderInspector(); } });
    });
  }
  $("#share-instead").addEventListener("click", shareLink);
  $("#send").addEventListener("click", function () {
    if (!state.design.client_id) { shareLink(); return; }
    $("#send-who").textContent = "To " + (state.client.full_name || state.client.email || "your client") + (state.client.email ? " (" + state.client.email + ")" : "");
    sendDialog.showModal();
  });
  $("#send-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var note = $("#send-note").value.trim();
    save().then(function (ok) {
      if (ok === false) return;
      return sb.from("designs").update({ status: "in_review", sent_at: new Date().toISOString(), client_feedback: "" }).eq("id", designId).then(function (res) {
        if (res.error) return toast(res.error.message, "err");
        state.design.status = "in_review";
        state.design.client_feedback = "";
        renderStatus(); renderInspector();
        sendDialog.close();
        var msg = "I've sent you a new design to review: \"" + state.design.name + "\". Open My websites → Review design to take a look." + (note ? "\n\n" + note : "");
        var who = state.client.full_name || "Your client";
        var wantEmail = $("#send-email").checked;
        sb.from("messages").insert({ client_id: state.design.client_id, sender_id: state.me.id, body: msg }).then(function () {
          if (!wantEmail) return toast("Sent! " + who + " can review it now.");
          return window.MWCShare.send(sb, { kind: "portal", designId: designId, note: note }).then(function () {
            toast("Sent and emailed! " + who + " can review it now.");
          }, function (err) {
            toast("Sent to their portal, but the email didn't go: " + err.message, "err");
          });
        });
      });
    });
  });
})();
