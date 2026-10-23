// Owner panel: Supabase sign-in, leads, products & pricing, site settings and account.
// Security lives in the database (row level security); this page only shows what the signed-in user may see.

(function () {
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var R = window.MWCRender;
  var esc = R.esc;
  var cfg = window.MWC_CONFIG;
  if (!window.supabase) {
    document.getElementById("loading").hidden = true;
    document.getElementById("login-view").hidden = false;
    document.getElementById("login-error").textContent = "Couldn't load the sign-in service. Check your connection (or ad blocker) and refresh.";
    return;
  }
  var sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: "mwc-owner" },
  });

  var state = { leads: [], products: [], settings: null, leadFilter: "all", leadSearch: "", kind: "package", editing: null };
  var STATUSES = [["new", "New"], ["contacted", "Contacted"], ["mockup", "Mockup sent"], ["proposal", "Proposal"], ["won", "Won"], ["lost", "Lost"]];

  function toast(message, kind) {
    var el = document.createElement("div");
    el.className = "glass toast-msg " + (kind || "ok");
    el.textContent = message;
    $("#toasts").appendChild(el);
    setTimeout(function () { el.remove(); }, 3800);
  }

  function show(id) {
    ["loading", "login-view", "app-view"].forEach(function (v) { document.getElementById(v).hidden = v !== id; });
  }

  // ---------- Auth ----------
  function start() {
    sb.auth.getSession().then(function (res) {
      var session = res.data && res.data.session;
      if (session) enter(session.user);
      else show("login-view");
    }).catch(function () { show("login-view"); });
  }

  function enter(user) {
    // Only accounts listed in public.admins may use the panel
    sb.from("admins").select("user_id").eq("user_id", user.id).maybeSingle().then(function (res) {
      if (res.error || !res.data) {
        sb.auth.signOut();
        $("#login-error").textContent = "This account doesn't have owner access.";
        show("login-view");
        return;
      }
      $("#who-email").textContent = user.email;
      var hour = new Date().getHours();
      var name = (user.user_metadata && user.user_metadata.name ? user.user_metadata.name.split(" ")[0] : "");
      $("#greeting").innerHTML = (hour < 12 ? "Morning" : hour < 18 ? "G'day" : "Evening") + (name ? ", " + esc(name) : "") + '<span class="serif">.</span>';
      show("app-view");
      loadAll();
    });
  }

  $("#login-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var btn = $("button[type=submit]", e.target);
    btn.disabled = true;
    $("#login-error").textContent = "";
    sb.auth.signInWithPassword({ email: $("#login-email").value.trim(), password: $("#login-password").value })
      .then(function (res) {
        btn.disabled = false;
        if (res.error) { $("#login-error").textContent = "Email or password is incorrect."; return; }
        $("#login-password").value = "";
        enter(res.data.user);
      })
      .catch(function () { btn.disabled = false; $("#login-error").textContent = "Couldn't reach the server. Check your connection."; });
  });

  $("#pw-toggle").addEventListener("click", function () {
    var input = $("#login-password");
    var hidden = input.type === "password";
    input.type = hidden ? "text" : "password";
    this.textContent = hidden ? "Hide" : "Show";
  });

  $$("[data-signout]").forEach(function (b) {
    b.addEventListener("click", function () { sb.auth.signOut().then(function () { show("login-view"); }); });
  });

  // ---------- Navigation ----------
  function go(view) {
    $$(".side-link").forEach(function (l) {
      if (l.dataset.view === view) l.setAttribute("aria-current", "page");
      else l.removeAttribute("aria-current");
    });
    $$(".view").forEach(function (v) { v.classList.toggle("active", v.dataset.view === view); });
    window.scrollTo(0, 0);
  }
  $$(".side-link").forEach(function (l) { l.addEventListener("click", function () { go(l.dataset.view); }); });
  $$("[data-goto]").forEach(function (b) { b.addEventListener("click", function () { go(b.dataset.goto); }); });

  // ---------- Data ----------
  function loadAll() {
    return Promise.all([loadLeads(), loadProducts(), loadSettings()]).then(renderOverview);
  }

  function loadLeads() {
    return sb.from("leads").select("*").order("created_at", { ascending: false }).then(function (res) {
      if (res.error) { toast("Couldn't load leads: " + res.error.message, "err"); return; }
      state.leads = res.data;
      renderLeads();
    });
  }

  function loadProducts() {
    return sb.from("products").select("*").order("kind").order("sort").then(function (res) {
      if (res.error) { toast("Couldn't load products: " + res.error.message, "err"); return; }
      state.products = res.data;
      renderProducts();
    });
  }

  function loadSettings() {
    return sb.from("site_settings").select("*").eq("id", 1).single().then(function (res) {
      if (res.error) { toast("Couldn't load settings: " + res.error.message, "err"); return; }
      state.settings = res.data;
      renderSettings();
    });
  }

  // ---------- Overview ----------
  function renderOverview() {
    var leads = state.leads;
    var count = function (s) { return leads.filter(function (l) { return l.status === s; }).length; };
    var won = count("won"), lost = count("lost");
    $("#k-new").textContent = count("new");
    $("#k-total").textContent = leads.length;
    $("#k-won").textContent = won;
    $("#k-rate").textContent = won + lost ? Math.round(won / (won + lost) * 100) + "%" : "–";
    $("#k-seats").textContent = state.settings ? state.settings.founding_seats_left : "–";
    $("#new-count").textContent = count("new") || "";
    var recent = leads.slice(0, 4);
    $("#recent-leads").innerHTML = recent.length ? recent.map(leadCard).join("") : emptyLeads();
    bindLeadCards($("#recent-leads"));
  }

  // ---------- Leads ----------
  function when(iso) {
    var d = new Date(iso), mins = Math.round((Date.now() - d) / 60000);
    if (mins < 60) return mins <= 1 ? "just now" : mins + " min ago";
    if (mins < 1440) return Math.round(mins / 60) + " h ago";
    if (mins < 10080) return Math.round(mins / 1440) + " d ago";
    return d.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
  }

  function emptyLeads() {
    return '<div class="empty"><b>No leads yet</b>When someone fills in the free mockup form, they\'ll appear here.</div>';
  }

  function leadCard(l) {
    var site = l.website ? (/^https?:\/\//i.test(l.website) ? l.website : "https://" + l.website) : null;
    var options = STATUSES.map(function (s) { return '<option value="' + s[0] + '"' + (s[0] === l.status ? " selected" : "") + ">" + s[1] + "</option>"; }).join("");
    return (
      '<article class="glass lead-item" data-id="' + l.id + '">' +
        "<div><h3><span class=\"status-dot s-" + l.status + '"></span>' + esc(l.name) + "</h3>" +
          '<div class="sub">' + esc(l.business) + " · " + when(l.created_at) + "</div>" +
          '<div class="tags">' + (l.industry ? '<span class="tag-pill">' + esc(l.industry) + "</span>" : "") + (l.package ? '<span class="tag-pill">Package: ' + esc(l.package) + "</span>" : "") + "</div>" +
          (l.message ? '<p class="msg">' + esc(l.message) + "</p>" : "") +
        "</div>" +
        '<div class="lead-contact">' +
          '<a href="tel:' + esc(l.phone.replace(/\s+/g, "")) + '">📞 ' + esc(l.phone) + "</a>" +
          (l.email ? '<a href="mailto:' + esc(l.email) + '">✉️ ' + esc(l.email) + "</a>" : "") +
          (site ? '<a href="' + esc(site) + '" target="_blank" rel="noopener noreferrer">🌐 ' + esc(l.website) + "</a>" : "") +
        "</div>" +
        '<div class="lead-side"><select aria-label="Status" data-field="status">' + options + "</select>" +
          '<button class="btn btn-danger btn-sm" data-delete-lead>Delete</button></div>' +
        '<div class="lead-notes"><textarea data-field="notes" placeholder="Notes (saved automatically)" aria-label="Notes">' + esc(l.notes) + "</textarea></div>" +
      "</article>"
    );
  }

  function bindLeadCards(root) {
    $$(".lead-item", root).forEach(function (card) {
      var id = card.dataset.id;
      $('[data-field="status"]', card).addEventListener("change", function () { updateLead(id, { status: this.value }); });
      $('[data-field="notes"]', card).addEventListener("change", function () { updateLead(id, { notes: this.value }); });
      $("[data-delete-lead]", card).addEventListener("click", function () {
        if (!confirm("Delete this lead? This can't be undone.")) return;
        sb.from("leads").delete().eq("id", id).then(function (res) {
          if (res.error) return toast(res.error.message, "err");
          state.leads = state.leads.filter(function (l) { return l.id !== id; });
          renderLeads(); renderOverview(); toast("Lead deleted");
        });
      });
    });
  }

  function updateLead(id, changes) {
    sb.from("leads").update(changes).eq("id", id).then(function (res) {
      if (res.error) return toast(res.error.message, "err");
      state.leads.forEach(function (l) { if (l.id === id) Object.assign(l, changes); });
      renderLeads(); renderOverview(); toast("Saved");
    });
  }

  function renderLeads() {
    var q = state.leadSearch.toLowerCase();
    var list = state.leads.filter(function (l) {
      if (state.leadFilter !== "all" && l.status !== state.leadFilter) return false;
      if (!q) return true;
      return [l.name, l.business, l.phone, l.email, l.message, l.notes, l.industry].join(" ").toLowerCase().indexOf(q) !== -1;
    });
    $("#lead-list").innerHTML = list.length ? list.map(leadCard).join("") : (state.leads.length ? '<div class="empty"><b>No matches</b>Try another filter or search.</div>' : emptyLeads());
    bindLeadCards($("#lead-list"));
  }

  $$("#lead-filters button").forEach(function (b) {
    b.addEventListener("click", function () {
      state.leadFilter = b.dataset.status;
      $$("#lead-filters button").forEach(function (x) { x.setAttribute("aria-pressed", x === b); });
      renderLeads();
    });
  });
  $("#lead-search").addEventListener("input", function () { state.leadSearch = this.value; renderLeads(); });
  $("#refresh-leads").addEventListener("click", function () { loadLeads().then(function () { renderOverview(); toast("Leads refreshed"); }); });
  $("#export-leads").addEventListener("click", function () {
    var cols = ["created_at", "status", "name", "business", "phone", "email", "website", "industry", "package", "message", "notes"];
    var cell = function (v) { return '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"'; };
    var csv = [cols.join(",")].concat(state.leads.map(function (l) { return cols.map(function (c) { return cell(l[c]); }).join(","); })).join("\n");
    var a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "marshall-leads-" + new Date().toISOString().slice(0, 10) + ".csv";
    a.click();
  });

  // ---------- Products ----------
  function priceLabel(p) {
    if (p.price_upfront != null && p.price_monthly != null) return R.money(p.price_upfront) + "<small>or " + R.money(p.price_monthly) + "/mo</small>";
    if (p.price_upfront != null) return R.money(p.price_upfront) + "<small>one-off</small>";
    if (p.price_monthly != null) return R.money(p.price_monthly) + "<small>per month</small>";
    return "–";
  }

  function renderProducts() {
    var list = state.products.filter(function (p) { return p.kind === state.kind; });
    $("#prod-list").innerHTML = list.length ? list.map(function (p) {
      return '<div class="glass prod-item' + (p.active ? "" : " inactive") + '">' +
        "<div><h3>" + esc(p.name) + (p.badge ? ' <span class="mini-badge">' + esc(p.badge) + "</span>" : "") + (p.active ? "" : ' <span class="mini-badge off">Hidden</span>') + "</h3>" +
        '<div class="sub">' + esc(p.tagline) + "</div></div>" +
        '<div class="prod-price">' + priceLabel(p) + "</div>" +
        '<button class="btn btn-glass btn-sm" data-edit="' + p.id + '">Edit</button>' +
      "</div>";
    }).join("") : '<div class="glass empty"><b>Nothing here yet</b>Add your first one with "+ Add product".</div>';
    $$("[data-edit]").forEach(function (b) {
      b.addEventListener("click", function () { openEditor(state.products.find(function (p) { return p.id === b.dataset.edit; })); });
    });
  }

  $$("#kind-tabs button").forEach(function (b) {
    b.addEventListener("click", function () {
      state.kind = b.dataset.kind;
      $$("#kind-tabs button").forEach(function (x) { x.setAttribute("aria-pressed", x === b); });
      renderProducts();
    });
  });

  var editor = $("#editor");
  var F = function (id) { return document.getElementById("e-" + id); };
  var slugify = function (s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40); };

  function openEditor(p) {
    state.editing = p || null;
    var kind = p ? p.kind : state.kind;
    $("#editor-title").textContent = p ? "Edit " + p.name : "New product";
    F("name").value = p ? p.name : "";
    F("kind").value = kind;
    F("tagline").value = p ? p.tagline : "";
    F("upfront").value = p && p.price_upfront != null ? p.price_upfront : "";
    F("monthly").value = p && p.price_monthly != null ? p.price_monthly : "";
    F("delivery").value = p ? p.delivery : "";
    F("features").value = p ? (p.features || []).join("\n") : "";
    F("badge").value = p && p.badge ? p.badge : "";
    var maxSort = Math.max.apply(null, [0].concat(state.products.filter(function (x) { return x.kind === kind; }).map(function (x) { return x.sort; })));
    F("sort").value = p ? p.sort : maxSort + 1;
    F("slug").value = p ? p.slug : "";
    F("featured").checked = p ? p.featured : false;
    F("active").checked = p ? p.active : true;
    F("delete").hidden = !p;
    preview();
    editor.showModal();
    F("name").focus();
  }

  function formProduct() {
    var num = function (el) { return el.value === "" ? null : Math.max(0, Math.round(+el.value)); };
    return {
      name: F("name").value.trim(),
      kind: F("kind").value,
      tagline: F("tagline").value.trim(),
      price_upfront: num(F("upfront")),
      price_monthly: num(F("monthly")),
      delivery: F("delivery").value.trim(),
      features: F("features").value.split("\n").map(function (s) { return s.trim(); }).filter(Boolean),
      badge: F("badge").value.trim() || null,
      sort: parseInt(F("sort").value, 10) || 0,
      slug: F("slug").value.trim(),
      featured: F("featured").checked,
      active: F("active").checked,
    };
  }

  function preview() {
    var p = formProduct();
    p.name = p.name || "Product name";
    var html = p.kind === "package" ? R.packages([p], "monthly")
      : p.kind === "care" ? R.care([Object.assign({}, p, { price_monthly: p.price_monthly || 0 })])
      : '<div class="glass table-wrap"><table style="min-width:0"><tbody>' + R.addons([Object.assign({}, p, { price_upfront: p.price_upfront != null ? p.price_upfront : (p.price_monthly == null ? 0 : null) })]) + "</tbody></table></div>";
    $("#e-preview").innerHTML = p.active ? html : '<div class="glass empty"><b>Hidden</b>This product won\'t show on the website.</div>';
  }

  $("#editor-form").addEventListener("input", function (e) {
    if (e.target === F("name") && !state.editing) F("slug").value = slugify(F("name").value);
    preview();
  });
  $("#e-cancel").addEventListener("click", function () { editor.close(); });
  $$("[data-new-product]").forEach(function (b) { b.addEventListener("click", function () { go("products"); openEditor(null); }); });

  $("#editor-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var p = formProduct();
    if (!p.name || !/^[a-z0-9-]+$/.test(p.slug)) return toast("Add a name and a link name (lowercase letters, numbers and dashes).", "err");
    if (p.price_upfront == null && p.price_monthly == null) return toast("Add at least one price.", "err");
    var req = state.editing ? sb.from("products").update(p).eq("id", state.editing.id) : sb.from("products").insert(p);
    req.then(function (res) {
      if (res.error) return toast(res.error.code === "23505" ? "That link name is already used." : res.error.message, "err");
      editor.close();
      state.kind = p.kind;
      $$("#kind-tabs button").forEach(function (x) { x.setAttribute("aria-pressed", x.dataset.kind === p.kind); });
      loadProducts().then(function () { toast(state.editing ? "Saved. Live on the website now." : "Product added"); });
    });
  });

  F("delete").addEventListener("click", function () {
    var p = state.editing;
    if (!p || !confirm('Delete "' + p.name + '"? To keep it for later, switch off "Show on website" instead.')) return;
    sb.from("products").delete().eq("id", p.id).then(function (res) {
      if (res.error) return toast(res.error.message, "err");
      editor.close();
      loadProducts().then(function () { toast("Product deleted"); });
    });
  });

  // ---------- Settings ----------
  var seats = 5;
  function renderSeats() {
    $("#seats-out").textContent = seats;
    $("#seats-preview").innerHTML = R.seatIcons(seats, 5);
  }
  function renderSettings() {
    var s = state.settings;
    seats = s.founding_seats_left;
    $("#discount").value = s.founding_discount;
    $("#announcement").value = s.announcement;
    $("#show-announcement").checked = s.show_announcement;
    renderSeats();
  }
  $$("[data-step]").forEach(function (b) {
    b.addEventListener("click", function () { seats = Math.min(5, Math.max(0, seats + +b.dataset.step)); renderSeats(); });
  });
  $("#settings-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var changes = {
      founding_seats_left: seats,
      founding_discount: Math.min(100, Math.max(0, parseInt($("#discount").value, 10) || 0)),
      announcement: $("#announcement").value.trim(),
      show_announcement: $("#show-announcement").checked,
    };
    sb.from("site_settings").update(changes).eq("id", 1).then(function (res) {
      if (res.error) return toast(res.error.message, "err");
      Object.assign(state.settings, changes);
      renderOverview();
      toast("Settings saved. Live on the website now.");
    });
  });

  // ---------- Account ----------
  $("#password-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var a = $("#new-pw").value, b = $("#new-pw2").value;
    if (a.length < 10) return toast("Use at least 10 characters.", "err");
    if (a !== b) return toast("The passwords don't match.", "err");
    sb.auth.updateUser({ password: a }).then(function (res) {
      if (res.error) return toast(res.error.message, "err");
      e.target.reset();
      toast("Password updated");
    });
  });

  start();
})();
