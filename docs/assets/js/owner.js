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
    auth: { persistSession: true, autoRefreshToken: true, storageKey: "mwc-auth" },
  });

  var state = { leads: [], products: [], settings: null, clients: [], sites: [], requests: [], leadFilter: "all", leadSearch: "", reqFilter: "open", clientSearch: "", kind: "package", editing: null, editingSite: null, siteClient: null };
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
      state.me = user.id;
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
    return Promise.all([loadLeads(), loadProducts(), loadSettings(), loadClients(), loadRequests(), loadDesigns(), loadInbox()]).then(function () { renderRequests(); renderDesigns(); renderInbox(); renderOverview(); openFromHash(); });
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
    var won = count("won");
    $("#k-new").textContent = count("new");
    $("#k-total").textContent = leads.length;
    $("#k-won").textContent = won;
    var open = state.requests.filter(function (r) { return r.status !== "done"; }).length;
    $("#k-clients").textContent = state.clients.length;
    $("#k-open").textContent = open;
    $("#open-count").textContent = open || "";
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

  // ---------- Clients and their websites ----------
  function loadClients() {
    return Promise.all([
      sb.from("profiles").select("*").order("created_at", { ascending: false }),
      sb.from("sites").select("*").order("created_at"),
    ]).then(function (r) {
      if (r[0].error || r[1].error) { toast("Couldn't load clients: " + (r[0].error || r[1].error).message, "err"); return; }
      var me = state.me;
      state.clients = r[0].data.filter(function (c) { return c.id !== me; });
      state.sites = r[1].data;
      renderClients();
    });
  }

  var SITE_LABEL = { mockup: "Mockup", building: "Building", review: "Ready for review", live: "Live", paused: "Paused" };

  function renderClients() {
    var q = state.clientSearch.toLowerCase();
    var list = state.clients.filter(function (c) {
      return !q || [c.full_name, c.business, c.email, c.phone].join(" ").toLowerCase().indexOf(q) !== -1;
    });
    $("#client-list").innerHTML = list.length ? list.map(function (c) {
      var sites = state.sites.filter(function (s) { return s.client_id === c.id; });
      return '<article class="glass client-item"><div class="top"><div>' +
          "<h3>" + esc(c.full_name || "(no name)") + "</h3>" +
          '<div class="sub">' + esc(c.business || "No business name") + " · joined " + new Date(c.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }) + "</div>" +
          '<div class="contact">' + (c.email ? '<a href="mailto:' + esc(c.email) + '">✉️ ' + esc(c.email) + "</a>" : "") + (c.phone ? '<a href="tel:' + esc(c.phone.replace(/\s+/g, "")) + '">📞 ' + esc(c.phone) + "</a>" : "") + "</div>" +
        "</div>" +
        '<div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn btn-glass btn-sm" data-message-client="' + c.id + '">Message</button><button class="btn btn-primary btn-sm" data-add-site="' + c.id + '">+ Add website</button></div></div>' +
        (sites.length ? '<div class="client-sites">' + sites.map(function (s) {
          return '<div class="client-site"><div><b>' + esc(s.name) + '</b> <span class="status-pill ' + s.status + '">' + SITE_LABEL[s.status] + "</span></div>" +
            '<div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn btn-glass btn-sm" data-design-site="' + s.id + '">New design</button><button class="btn btn-glass btn-sm" data-edit-site="' + s.id + '">Edit</button></div></div>';
        }).join("") + "</div>" : "") +
      "</article>";
    }).join("") : '<div class="glass panel empty"><b>' + (state.clients.length ? "No matches" : "No client accounts yet") + "</b>" +
      (state.clients.length ? "Try another search." : "When clients create an account at /account.html, they'll appear here.") + "</div>";

    $$("[data-add-site]").forEach(function (b) { b.addEventListener("click", function () { openSiteEditor(null, b.dataset.addSite); }); });
    $$("[data-design-site]").forEach(function (b) { b.addEventListener("click", function () { openDesignDialog(b.dataset.designSite); }); });
    $$("[data-message-client]").forEach(function (b) { b.addEventListener("click", function () { go("messages"); openThread(b.dataset.messageClient); }); });
    $$("[data-edit-site]").forEach(function (b) {
      b.addEventListener("click", function () {
        var site = state.sites.find(function (s) { return s.id === b.dataset.editSite; });
        openSiteEditor(site, site.client_id);
      });
    });
  }

  $("#client-search").addEventListener("input", function () { state.clientSearch = this.value; renderClients(); });

  var siteEditor = $("#site-editor");
  var S = function (id) { return document.getElementById("s-" + id); };

  function openSiteEditor(site, clientId) {
    state.editingSite = site || null;
    state.siteClient = clientId;
    var client = state.clients.find(function (c) { return c.id === clientId; }) || {};
    $("#site-editor-title").textContent = site ? "Edit website" : "Add a website";
    $("#site-client").textContent = "For " + (client.full_name || client.email || "client") + (client.business ? " · " + client.business : "");
    $("#package-names").innerHTML = state.products.filter(function (p) { return p.kind === "package"; }).map(function (p) { return '<option value="' + esc(p.name) + '">'; }).join("");
    S("name").value = site ? site.name : (client.business ? client.business + " website" : "");
    S("status").value = site ? site.status : "mockup";
    S("package").value = site ? site.package : "";
    S("mockup").value = site ? site.mockup_url : "";
    S("url").value = site ? site.url : "";
    S("plan").value = site ? site.plan : "monthly";
    S("price").value = site && site.price != null ? site.price : "";
    S("next").value = site && site.next_payment ? site.next_payment : "";
    S("note").value = site ? site.client_note : "";
    S("delete").hidden = !site;
    siteEditor.showModal();
    S("name").focus();
  }

  $("#s-cancel").addEventListener("click", function () { siteEditor.close(); });

  $("#site-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var row = {
      client_id: state.siteClient,
      name: S("name").value.trim(),
      status: S("status").value,
      package: S("package").value.trim(),
      mockup_url: S("mockup").value.trim(),
      url: S("url").value.trim(),
      plan: S("plan").value,
      price: S("price").value === "" ? null : Math.max(0, Math.round(+S("price").value)),
      next_payment: S("next").value || null,
      client_note: S("note").value.trim(),
    };
    if (!row.name) return toast("Give the website a name.", "err");
    var req = state.editingSite ? sb.from("sites").update(row).eq("id", state.editingSite.id) : sb.from("sites").insert(row);
    req.then(function (res) {
      if (res.error) return toast(res.error.message, "err");
      siteEditor.close();
      loadClients().then(function () { renderOverview(); toast("Saved. The client can see it now."); });
    });
  });

  $("#s-delete").addEventListener("click", function () {
    var site = state.editingSite;
    if (!site || !confirm('Delete "' + site.name + '" and its change requests? This can\'t be undone.')) return;
    sb.from("sites").delete().eq("id", site.id).then(function (res) {
      if (res.error) return toast(res.error.message, "err");
      siteEditor.close();
      Promise.all([loadClients(), loadRequests()]).then(function () { renderOverview(); toast("Website deleted"); });
    });
  });

  // ---------- Change requests ----------
  function loadRequests() {
    return sb.from("change_requests").select("*").order("created_at", { ascending: false }).then(function (res) {
      if (res.error) { toast("Couldn't load requests: " + res.error.message, "err"); return; }
      state.requests = res.data;
      renderRequests();
    });
  }

  var REQ_LABEL = { open: "Open", in_progress: "In progress", done: "Done" };

  function renderRequests() {
    var siteName = {}, clientName = {};
    state.sites.forEach(function (s) { siteName[s.id] = s.name; });
    state.clients.forEach(function (c) { clientName[c.id] = c.full_name || c.email; });
    var list = state.requests.filter(function (r) { return state.reqFilter === "all" || r.status === state.reqFilter; });
    $("#owner-req-list").innerHTML = list.length ? list.map(function (r) {
      var options = Object.keys(REQ_LABEL).map(function (k) { return '<option value="' + k + '"' + (k === r.status ? " selected" : "") + ">" + REQ_LABEL[k] + "</option>"; }).join("");
      return '<article class="glass req-item" data-req="' + r.id + '"><div class="top"><div>' +
          "<h3>" + esc(r.title) + "</h3>" +
          '<div class="sub">' + esc(clientName[r.client_id] || "Client") + " · " + esc(siteName[r.site_id] || "Website") + " · " + new Date(r.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short" }) + "</div></div>" +
          '<span class="status-pill ' + (r.priority === "urgent" ? "open" : r.status) + '">' + (r.priority === "urgent" ? "Urgent" : REQ_LABEL[r.status]) + "</span></div>" +
        (r.details ? '<p class="body">' + esc(r.details) + "</p>" : "") +
        '<div class="req-owner"><textarea data-field="owner_reply" placeholder="Reply to the client (they see this in their portal)" aria-label="Reply">' + esc(r.owner_reply) + "</textarea>" +
          '<div style="display:grid;gap:8px;align-content:start"><select data-field="status" aria-label="Status">' + options + '</select><button class="btn btn-danger btn-sm" data-delete-req>Delete</button></div></div>' +
      "</article>";
    }).join("") : '<div class="empty"><b>Nothing here</b>' + (state.requests.length ? "No requests with this status." : "When clients request changes, they'll appear here.") + "</div>";

    $$("#owner-req-list [data-req]").forEach(function (card) {
      var id = card.dataset.req;
      $$("[data-field]", card).forEach(function (field) {
        field.addEventListener("change", function () {
          var changes = {};
          changes[field.dataset.field] = field.value;
          sb.from("change_requests").update(changes).eq("id", id).then(function (res) {
            if (res.error) return toast(res.error.message, "err");
            state.requests.forEach(function (r) { if (r.id === id) Object.assign(r, changes); });
            if (field.dataset.field === "status") renderRequests();
            renderOverview();
            toast(field.dataset.field === "status" ? "Status updated" : "Reply saved. The client can see it now.");
          });
        });
      });
      $("[data-delete-req]", card).addEventListener("click", function () {
        if (!confirm("Delete this request?")) return;
        sb.from("change_requests").delete().eq("id", id).then(function (res) {
          if (res.error) return toast(res.error.message, "err");
          state.requests = state.requests.filter(function (r) { return r.id !== id; });
          renderRequests(); renderOverview();
        });
      });
    });
  }

  $$("#req-filters button").forEach(function (b) {
    b.addEventListener("click", function () {
      state.reqFilter = b.dataset.status;
      $$("#req-filters button").forEach(function (x) { x.setAttribute("aria-pressed", x === b); });
      renderRequests();
    });
  });

  // ---------- Designs (site builder) ----------
  var DESIGN_STATUS = { draft: ["Draft", "paused"], in_review: ["With client", "review"], approved: ["Approved", "live"], changes_requested: ["Changes requested", "open"] };

  function loadDesigns() {
    return sb.from("designs").select("id,site_id,client_id,name,status,client_feedback,sent_at,reviewed_at,updated_at,prospect_name,prospect_contact,prospect_email,share_token,shared,reviewer_name,theme:content->theme").order("updated_at", { ascending: false }).then(function (res) {
      if (res.error) { toast("Couldn't load designs: " + res.error.message, "err"); return; }
      state.designs = res.data;
    });
  }

  function clientLabel(id) { var c = state.clients.find(function (x) { return x.id === id; }); return c ? (c.full_name || c.email) : "Client"; }
  function siteLabel(id) { var s = state.sites.find(function (x) { return x.id === id; }); return s ? s.name : "Website"; }

  function renderDesigns() {
    var list = state.designs || [];
    $("#design-count").textContent = list.filter(function (d) { return d.status === "changes_requested"; }).length || "";
    $("#designs-list").innerHTML = list.length ? list.map(function (d) {
      var st = DESIGN_STATUS[d.status];
      var who = d.client_id ? esc(clientLabel(d.client_id)) + " · " + esc(siteLabel(d.site_id)) : "Prospect: " + esc(d.prospect_name || (d.theme && d.theme.business) || "no client yet");
      var assign = !d.client_id && state.sites.length ? '<select class="btn-sm" data-assign="' + d.id + '" aria-label="Link to a client website" style="width:auto;padding:8px 10px"><option value="">Link to client…</option>' +
        state.sites.map(function (s) { return '<option value="' + s.id + '">' + esc(siteLabel(s.id)) + " · " + esc(clientLabel(s.client_id)) + "</option>"; }).join("") + "</select>" : "";
      return '<article class="glass design-item"><div><h3>' + esc(d.name) + ' <span class="status-pill ' + st[1] + '">' + st[0] + "</span>" + (d.shared ? ' <span class="tag-pill">🔗 Link on</span>' : "") + "</h3>" +
        '<div class="sub">' + who + " · edited " + when(d.updated_at) + "</div>" +
        (d.client_feedback ? '<div class="fb"><b>' + esc(d.reviewer_name || "Client") + ":</b> " + esc(d.client_feedback) + "</div>" : "") +
        (d.status === "approved" && !d.client_feedback ? '<div class="fb"><b>Approved' + (d.reviewer_name ? " by " + esc(d.reviewer_name) : "") + "</b> " + (d.reviewed_at ? when(d.reviewed_at) : "") + "</div>" : "") + "</div>" +
        '<div class="actions"><a class="btn btn-primary btn-sm" href="builder.html?id=' + d.id + '">Open builder</a>' +
        '<button class="btn btn-glass btn-sm" data-share-design="' + d.id + '">Send / share</button>' +
        (d.shared ? '<a class="btn btn-glass btn-sm" href="' + esc(window.MWCShare.reviewUrl(d)) + '" target="_blank" rel="noopener">View ↗</a>' : "") +
        assign + '<button class="btn btn-danger btn-sm" data-delete-design="' + d.id + '">Delete</button></div></article>';
    }).join("") : '<div class="glass panel empty"><b>No designs yet</b>Click "+ New design" to build a website for a client or a prospect.</div>';
    $$("[data-share-design]").forEach(function (b) {
      b.addEventListener("click", function () {
        var d = state.designs.find(function (x) { return x.id === b.dataset.shareDesign; });
        window.MWCShare.open({ sb: sb, design: d, toast: toast, onChange: renderDesigns });
      });
    });
    $$("[data-assign]").forEach(function (sel) {
      sel.addEventListener("change", function () {
        var site = state.sites.find(function (s) { return s.id === sel.value; });
        if (!site) return;
        sb.from("designs").update({ site_id: site.id, client_id: site.client_id }).eq("id", sel.dataset.assign).then(function (res) {
          if (res.error) return toast(res.error.message, "err");
          loadDesigns().then(function () { renderDesigns(); toast("Linked. It now shows in " + clientLabel(site.client_id) + "'s portal once sent."); });
        });
      });
    });
    $$("[data-delete-design]").forEach(function (b) {
      b.addEventListener("click", function () {
        if (!confirm("Delete this design? This can't be undone.")) return;
        sb.from("designs").delete().eq("id", b.dataset.deleteDesign).then(function (res) {
          if (res.error) return toast(res.error.message, "err");
          loadDesigns().then(function () { renderDesigns(); toast("Design deleted"); });
        });
      });
    });
  }

  var designDialog = $("#design-dialog");
  var chosenTpl = "trades";
  function openDesignDialog(siteId) {
    $("#d-site").innerHTML = '<option value="">A prospect (no account yet, share by link)</option>' +
      state.sites.map(function (s) { return '<option value="' + s.id + '">' + esc(siteLabel(s.id)) + " · " + esc(clientLabel(s.client_id)) + "</option>"; }).join("");
    $("#d-site").value = siteId || "";
    $("#d-prospect").hidden = !!$("#d-site").value;
    designDialog.showModal();
  }
  $("#d-site").addEventListener("change", function () { $("#d-prospect").hidden = !!this.value; });
  $$("[data-new-design]").forEach(function (b) { b.addEventListener("click", function () { go("designs"); openDesignDialog(null); }); });
  $("#d-cancel").addEventListener("click", function () { designDialog.close(); });
  $$("#tpl-grid [data-tpl]").forEach(function (b) {
    b.addEventListener("click", function () { chosenTpl = b.dataset.tpl; $$("#tpl-grid [data-tpl]").forEach(function (x) { x.setAttribute("aria-pressed", x === b); }); });
  });
  $("#design-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var site = state.sites.find(function (s) { return s.id === $("#d-site").value; });
    var prospect = $("#d-pname").value.trim();
    if (!site && !prospect) return toast("Add the business name for this prospect.", "err");
    var client = site ? state.clients.find(function (c) { return c.id === site.client_id; }) || {} : { business: prospect, email: $("#d-pemail").value.trim() };
    if (!site) site = { name: prospect };
    var create = function (content) {
      var row = { name: $("#d-name").value.trim() || "Homepage", content: content };
      if (site.id) { row.site_id = site.id; row.client_id = site.client_id; }
      else { row.prospect_name = prospect; row.prospect_email = $("#d-pemail").value.trim(); }
      sb.from("designs").insert(row).select("id").single().then(function (res) {
        if (res.error) return toast(res.error.message, "err");
        window.location.href = "builder.html?id=" + res.data.id;
      });
    };
    var file = $("#d-import").files[0];
    if (!file) { create(window.MWCBuilder.template(chosenTpl, { business: client.business || site.name, phone: client.phone || "", email: client.email || "" })); return; }
    file.text().then(function (text) {
      var content;
      try { content = JSON.parse(text); } catch (err) { content = null; }
      var known = content && Array.isArray(content.blocks) && content.blocks.every(function (b) { return b && window.MWCBuilder.BLOCKS[b.type]; });
      if (!known) return toast("That file isn't a design from the site builder.", "err");
      create(content);
    });
  });

  // ---------- Messages ----------
  var thread = null, activeClient = null;
  function loadInbox() {
    return sb.from("messages").select("id,client_id,sender_id,body,created_at,read_at").order("created_at", { ascending: false }).limit(1000).then(function (res) {
      if (res.error) return;
      state.inbox = res.data;
    });
  }
  function renderInbox() {
    var me = state.me, byClient = {};
    (state.inbox || []).forEach(function (m) {
      var c = byClient[m.client_id] = byClient[m.client_id] || { last: m, unread: 0 };
      if (m.sender_id !== me && !m.read_at) c.unread++;
    });
    var total = Object.keys(byClient).reduce(function (n, k) { return n + byClient[k].unread; }, 0);
    $("#unread-count").textContent = total || "";
    var clients = state.clients.slice().sort(function (a, b) {
      var la = byClient[a.id] ? byClient[a.id].last.created_at : "", lb = byClient[b.id] ? byClient[b.id].last.created_at : "";
      return la < lb ? 1 : la > lb ? -1 : 0;
    });
    $("#convo-list").innerHTML = clients.length ? clients.map(function (c) {
      var info = byClient[c.id];
      var name = c.full_name || c.email;
      return '<button class="convo" data-convo="' + c.id + '" aria-current="' + (c.id === activeClient) + '"><span class="chat-avatar">' + esc(name.charAt(0).toUpperCase()) + '</span><span class="c-text"><b>' + esc(name) + "</b><span>" +
        (info ? esc((info.last.sender_id === me ? "You: " : "") + info.last.body) : esc(c.business || "No messages yet")) + "</span></span>" + (info && info.unread ? '<span class="unread">' + info.unread + "</span>" : "") + "</button>";
    }).join("") : '<div class="empty"><b>No clients yet</b>When clients sign up, you can chat with them here.</div>';
    $$("[data-convo]").forEach(function (b) { b.addEventListener("click", function () { openThread(b.dataset.convo); }); });
  }
  function refreshInbox() { if (state.me) loadInbox().then(renderInbox); }
  function openThread(clientId) {
    var c = state.clients.find(function (x) { return x.id === clientId; });
    if (!c) return;
    activeClient = clientId;
    if (thread) thread.destroy();
    thread = new window.MWCChat.Thread({
      sb: sb, root: $("#owner-thread"), clientId: clientId, meId: state.me,
      otherName: c.full_name || c.email, subtitle: c.business || c.email,
      emptyText: "Say hi! " + (c.full_name || "Your client").split(" ")[0] + " will see your message in their portal.",
      onActivity: refreshInbox, onError: function (m) { toast(m, "err"); },
    });
    renderInbox();
  }
  // Keep unread badges current even when the Messages section isn't open
  sb.channel("owner-inbox").on("postgres_changes", { event: "*", schema: "public", table: "messages" }, refreshInbox)
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "designs" }, function () { if (state.me) loadDesigns().then(renderDesigns); })
    .subscribe();
  setInterval(refreshInbox, window.MWC_POLL_MS || 20000);

  function openFromHash() {
    var view = (location.hash || "").slice(1);
    if (view && $('.side-link[data-view="' + view + '"]')) go(view);
  }

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
