// Client accounts: sign in, sign up, password reset and the client portal.
// The owner signs in here too and is sent on to the owner panel.
// Security lives in the database (row level security); this page only shows what the signed-in user may see.

(function () {
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var R = window.MWCRender;
  var esc = R.esc;
  var cfg = window.MWC_CONFIG;

  function show(id) {
    ["loading", "auth-view", "portal-view"].forEach(function (v) { document.getElementById(v).hidden = v !== id; });
  }

  if (!window.supabase) {
    show("auth-view");
    $("#signin-form .login-error").textContent = "Couldn't load the sign-in service. Check your connection (or ad blocker) and refresh.";
    return;
  }

  // Same storage key as the owner panel, so signing in here carries over to it
  var sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: "mwc-auth" },
  });
  var here = window.location.origin + window.location.pathname;
  var state = { user: null, profile: null, sites: [], requests: [], designs: [] };
  var recovering = false;

  function toast(message, kind) {
    var el = document.createElement("div");
    el.className = "glass toast-msg " + (kind || "ok");
    el.textContent = message;
    $("#toasts").appendChild(el);
    setTimeout(function () { el.remove(); }, 3800);
  }

  function safeUrl(u) {
    if (!u) return "";
    var full = /^https?:\/\//i.test(u) ? u : "https://" + u;
    return /^https?:\/\/[^\s"'<>]+$/i.test(full) ? full : "";
  }

  // ---------- Sign in / sign up panes ----------
  var TITLES = {
    signin: ['Welcome <span class="serif">back.</span>', "Sign in to see your website's progress and request changes."],
    signup: ['Create your <span class="serif">account.</span>', "Track your website, see your mockup and request changes any time."],
    forgot: ['Reset your <span class="serif">password.</span>', ""],
    reset: ['Choose a new <span class="serif">password.</span>', ""],
    message: ['Check your <span class="serif">email.</span>', ""],
  };

  function pane(name) {
    $$("[data-pane]").forEach(function (p) { p.hidden = p.dataset.pane !== name; });
    $$(".login-error").forEach(function (e) { e.textContent = ""; });
    $("#auth-tabs").hidden = !(name === "signin" || name === "signup");
    $$("#auth-tabs button").forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.mode === name); });
    $("#auth-title").innerHTML = TITLES[name][0];
    $("#auth-sub").textContent = TITLES[name][1];
    $("#auth-sub").hidden = !TITLES[name][1];
  }

  function message(html) {
    $("#auth-message").innerHTML = html;
    pane("message");
  }

  $$("#auth-tabs button").forEach(function (b) { b.addEventListener("click", function () { pane(b.dataset.mode); }); });
  $$("[data-show]").forEach(function (b) { b.addEventListener("click", function () { pane(b.dataset.show); }); });
  $$("[data-pw-toggle]").forEach(function (b) {
    b.addEventListener("click", function () {
      var input = document.getElementById(b.dataset.pwToggle);
      var hidden = input.type === "password";
      input.type = hidden ? "text" : "password";
      b.textContent = hidden ? "Hide" : "Show";
    });
  });

  function busy(form, on) { $("button[type=submit]", form).disabled = on; }
  function fail(form, text) { $(".login-error", form).textContent = text; busy(form, false); }

  $("#signin-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var form = e.target;
    busy(form, true);
    sb.auth.signInWithPassword({ email: $("#si-email").value.trim(), password: $("#si-password").value })
      .then(function (res) {
        if (res.error) {
          return fail(form, /confirm/i.test(res.error.message) ? "Please confirm your email first. Check your inbox for the link." : "Email or password is incorrect.");
        }
        $("#si-password").value = "";
        busy(form, false);
        route(res.data.user);
      })
      .catch(function () { fail(form, "Couldn't reach the server. Check your connection."); });
  });

  $("#signup-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var form = e.target;
    var password = $("#su-password").value;
    if (!$("#su-name").value.trim()) return fail(form, "Please add your name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test($("#su-email").value.trim())) return fail(form, "Please enter a valid email address.");
    if (password.length < 10) return fail(form, "Use a password with at least 10 characters.");
    if (!$("#su-terms").checked) return fail(form, "Please agree to the terms to continue.");
    busy(form, true);
    sb.auth.signUp({
      email: $("#su-email").value.trim(),
      password: password,
      options: {
        emailRedirectTo: here,
        data: { full_name: $("#su-name").value.trim(), business: $("#su-business").value.trim(), phone: $("#su-phone").value.trim() },
      },
    }).then(function (res) {
      if (res.error) return fail(form, /registered|exists/i.test(res.error.message) ? "There's already an account with that email. Try signing in." : res.error.message);
      busy(form, false);
      if (res.data.session) { route(res.data.user); return; }
      message("<b>Almost there!</b><br>We've sent a confirmation link to <b>" + esc(res.data.user ? res.data.user.email : "") + "</b>. Click it to finish creating your account, then sign in.");
    }).catch(function () { fail(form, "Couldn't reach the server. Check your connection."); });
  });

  $("#forgot-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var form = e.target;
    busy(form, true);
    sb.auth.resetPasswordForEmail($("#fp-email").value.trim(), { redirectTo: here }).then(function () {
      busy(form, false);
      // Same message either way, so the form doesn't reveal which emails have accounts
      message("If there's an account for that email, a reset link is on its way. It can take a few minutes, so check your spam folder too.");
    }).catch(function () { fail(form, "Couldn't reach the server. Check your connection."); });
  });

  $("#reset-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var form = e.target;
    var password = $("#rp-password").value;
    if (password.length < 10) return fail(form, "Use at least 10 characters.");
    busy(form, true);
    sb.auth.updateUser({ password: password }).then(function (res) {
      if (res.error) return fail(form, res.error.message);
      recovering = false;
      toast("Password updated");
      route(res.data.user);
    });
  });

  $$("[data-signout]").forEach(function (b) {
    b.addEventListener("click", function () { sb.auth.signOut().then(function () { pane("signin"); show("auth-view"); }); });
  });

  // ---------- Routing ----------
  sb.auth.onAuthStateChange(function (event) {
    if (event === "PASSWORD_RECOVERY") {
      recovering = true;
      pane("reset");
      show("auth-view");
    }
  });

  function start() {
    var params = new URLSearchParams(window.location.search);
    if (params.get("mode") === "signup") pane("signup"); else pane("signin");
    sb.auth.getSession().then(function (res) {
      if (recovering) return;
      var session = res.data && res.data.session;
      if (session) route(session.user);
      else show("auth-view");
    }).catch(function () { show("auth-view"); });
  }

  function route(user) {
    state.user = user;
    sb.from("admins").select("user_id").eq("user_id", user.id).maybeSingle().then(function (res) {
      if (res.data) { window.location.replace("owner.html"); return; }
      openPortal();
    });
  }

  // ---------- Portal ----------
  function go(view) {
    $$(".side-link").forEach(function (l) {
      if (l.dataset.view === view) l.setAttribute("aria-current", "page");
      else l.removeAttribute("aria-current");
    });
    $$(".view").forEach(function (v) { v.classList.toggle("active", v.dataset.view === view); });
    window.scrollTo(0, 0);
  }
  $$(".side-link").forEach(function (l) { l.addEventListener("click", function () { go(l.dataset.view); }); });
  var baseGo = go;
  go = function (view) { baseGo(view); if (view === "messages") openChat(); };

  function openPortal() {
    $("#who-email").textContent = state.user.email;
    show("portal-view");
    Promise.all([
      sb.from("profiles").select("*").eq("id", state.user.id).maybeSingle(),
      sb.from("sites").select("*").order("created_at"),
      sb.from("change_requests").select("*").order("created_at", { ascending: false }),
      sb.from("designs").select("*").order("updated_at", { ascending: false }),
    ]).then(function (r) {
      state.profile = r[0].data || { full_name: "", business: "", phone: "" };
      state.sites = r[1].data || [];
      state.requests = r[2].data || [];
      state.designs = r[3].data || [];
      var first = (state.profile.full_name || "").split(" ")[0];
      $("#greeting").innerHTML = "Hi" + (first ? ", " + esc(first) : "") + '<span class="serif">.</span>';
      $("#pf-name").value = state.profile.full_name;
      $("#pf-business").value = state.profile.business;
      $("#pf-phone").value = state.profile.phone;
      renderSites();
      renderRequests();
      refreshUnread();
      watchLive();
      if (new URLSearchParams(window.location.search).get("view") === "messages") go("messages");
    });
  }

  var STEPS = [["mockup", "Mockup"], ["building", "Building"], ["review", "Your review"], ["live", "Live"]];
  var STATUS_LABEL = { mockup: "Mockup", building: "Building", review: "Ready for review", live: "Live", paused: "Paused" };

  function renderSites() {
    var el = $("#site-cards");
    if (!state.sites.length) {
      el.innerHTML =
        '<div class="glass panel empty"><b>No websites here yet</b>' +
        "<p>Already chatting with Declan? Your website will appear here as soon as it's set up, along with your mockup and progress.</p>" +
        '<a class="btn btn-primary" href="contact.html">Get a free mockup</a></div>';
      return;
    }
    el.innerHTML = state.sites.map(function (s) {
      var stepIndex = STEPS.map(function (x) { return x[0]; }).indexOf(s.status);
      var steps = STEPS.map(function (x, i) { return '<div class="' + (stepIndex >= i ? "done" : "") + '">' + x[1] + "</div>"; }).join("");
      var live = safeUrl(s.url), mock = safeUrl(s.mockup_url);
      var price = s.price != null ? R.money(s.price) + (s.plan === "monthly" ? "/mo" : "") : "–";
      var next = s.next_payment ? new Date(s.next_payment + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }) : "–";
      return (
        '<article class="glass site-card">' +
          '<div class="head"><div><h3>' + esc(s.name) + '</h3><span class="status-pill ' + s.status + '">' + STATUS_LABEL[s.status] + "</span></div>" +
            '<div class="links">' +
              (mock ? '<a class="btn btn-glass btn-sm" href="' + esc(mock) + '" target="_blank" rel="noopener">View mockup ↗</a>' : "") +
              (live ? '<a class="btn btn-glass btn-sm" href="' + esc(live) + '" target="_blank" rel="noopener">Visit site ↗</a>' : "") +
              '<button class="btn btn-primary btn-sm" data-request="' + s.id + '">Request a change</button>' +
            "</div></div>" +
          (s.status !== "paused" ? '<div class="progress-steps">' + steps + "</div>" : "") +
          '<div class="facts">' +
            "<div>Package<b>" + esc(s.package || "–") + "</b></div>" +
            "<div>" + (s.plan === "monthly" ? "Monthly plan" : "Paid upfront") + "<b>" + price + "</b></div>" +
            "<div>Next payment<b>" + next + "</b></div>" +
          "</div>" +
          (s.client_note ? '<div class="owner-note"><b>Note from Declan:</b> ' + esc(s.client_note) + "</div>" : "") +
          designsFor(s.id) +
        "</article>"
      );
    }).join("");
    $$("[data-request]").forEach(function (b) {
      b.addEventListener("click", function () {
        go("requests");
        $("#rq-site").value = b.dataset.request;
        $("#rq-title").focus();
      });
    });
  }

  // ---------- Design review ----------
  var DESIGN_LABEL = { in_review: ["Waiting for your review", "review"], approved: ["Approved", "live"], changes_requested: ["Changes requested", "open"] };
  function designsFor(siteId) {
    var list = state.designs.filter(function (d) { return d.site_id === siteId; });
    return list.map(function (d) {
      if (d.status === "in_review") {
        return '<div class="review-banner"><div><b>✨ "' + esc(d.name) + '" is ready for you to review</b><div class="muted" style="font-size:.9rem">Have a look, then approve it or tell Declan what to change.</div></div><button class="btn btn-primary btn-sm" data-review="' + d.id + '">Review design</button></div>';
      }
      var st = DESIGN_LABEL[d.status];
      return '<div class="client-site" style="margin-top:12px"><div><b>' + esc(d.name) + '</b> <span class="status-pill ' + st[1] + '">' + st[0] + '</span></div><button class="btn btn-glass btn-sm" data-review="' + d.id + '">View</button></div>';
    }).join("");
  }

  var reviewing = null;
  $("#site-cards").addEventListener("click", function (e) {
    var b = e.target.closest("[data-review]");
    if (b) openReview(b.dataset.review);
  });
  function openReview(id) {
    reviewing = state.designs.find(function (d) { return d.id === id; });
    if (!reviewing) return;
    $("#review-title").textContent = reviewing.name;
    $("#review-actions").hidden = reviewing.status !== "in_review";
    $("#review-frame").srcdoc = window.MWCBuilder.renderSite(reviewing.content);
    $("#review").hidden = false;
    document.body.style.overflow = "hidden";
  }
  function closeReview() { $("#review").hidden = true; document.body.style.overflow = ""; reviewing = null; }
  $("#review-close").addEventListener("click", closeReview);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !$("#review").hidden && !$("#changes-dialog").open) closeReview(); });
  $$("[data-rdevice]").forEach(function (b) {
    b.addEventListener("click", function () {
      $$("[data-rdevice]").forEach(function (x) { x.setAttribute("aria-pressed", x === b); });
      $("#review-wrap").dataset.device = b.dataset.rdevice;
    });
  });

  function decide(status, feedback) {
    var d = reviewing;
    return sb.from("designs").update({ status: status, client_feedback: feedback || "" }).eq("id", d.id).then(function (res) {
      if (res.error) { toast(res.error.message, "err"); return; }
      d.status = status; d.client_feedback = feedback || "";
      var note = status === "approved" ? "I've approved \"" + d.name + "\" 🎉" : "I've asked for changes to \"" + d.name + "\":\n" + feedback;
      // Supabase queries only run once awaited, so .then() is required here
      sb.from("messages").insert({ client_id: state.user.id, sender_id: state.user.id, body: note }).then(refreshUnread);
      closeReview();
      renderSites();
      toast(status === "approved" ? "Approved! Declan will be in touch about going live." : "Feedback sent to Declan.");
    });
  }
  $("#review-approve").addEventListener("click", function () {
    if (confirm("Approve this design? Declan will be notified.")) decide("approved", "");
  });
  var changesDialog = $("#changes-dialog");
  $("#review-changes").addEventListener("click", function () { changesDialog.showModal(); $("#changes-text").focus(); });
  $("#changes-cancel").addEventListener("click", function () { changesDialog.close(); });
  $("#changes-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var text = $("#changes-text").value.trim();
    if (!text) return;
    changesDialog.close();
    decide("changes_requested", text).then(function () { $("#changes-text").value = ""; });
  });

  // ---------- Messages ----------
  var thread = null;
  function openChat() {
    if (thread) { thread.load(); return; }
    thread = new window.MWCChat.Thread({
      sb: sb, root: $("#client-thread"), clientId: state.user.id, meId: state.user.id,
      otherName: "Declan Marshall", subtitle: "Marshall Web Co. · usually replies within a day",
      emptyText: "Questions about your website? Send Declan a message.",
      onActivity: refreshUnread, onError: function (m) { toast(m, "err"); },
    });
  }
  function refreshUnread() {
    if (!state.user) return;
    sb.from("messages").select("id", { count: "exact", head: true }).neq("sender_id", state.user.id).is("read_at", null).then(function (res) {
      $("#unread-count").textContent = res.count || "";
    });
  }
  var live = false;
  function watchLive() {
    if (live) return;
    live = true;
    sb.channel("client-live-" + state.user.id)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: "client_id=eq." + state.user.id }, refreshUnread)
      .on("postgres_changes", { event: "*", schema: "public", table: "designs", filter: "client_id=eq." + state.user.id }, reloadDesigns)
      .subscribe();
    setInterval(function () { refreshUnread(); reloadDesigns(); }, window.MWC_POLL_MS || 20000);
  }
  function reloadDesigns() {
    if (!state.user || reviewing) return;
    sb.from("designs").select("*").order("updated_at", { ascending: false }).then(function (res) {
      if (res.error) return;
      if (JSON.stringify(res.data) === JSON.stringify(state.designs)) return;
      state.designs = res.data;
      renderSites();
    });
  }

  var REQ_LABEL = { open: "Open", in_progress: "In progress", done: "Done" };
  function renderRequests() {
    var names = {};
    state.sites.forEach(function (s) { names[s.id] = s.name; });
    $("#rq-site").innerHTML = state.sites.map(function (s) { return '<option value="' + s.id + '">' + esc(s.name) + "</option>"; }).join("");
    $("#new-request-panel").hidden = !state.sites.length;
    $("#req-list").innerHTML = state.requests.length ? state.requests.map(function (r) {
      return '<article class="glass req-item"><div class="top"><div><h3>' + esc(r.title) + "</h3>" +
        '<div class="sub">' + esc(names[r.site_id] || "Website") + " · " + new Date(r.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short" }) + (r.priority === "urgent" ? " · Urgent" : "") + "</div></div>" +
        '<span class="status-pill ' + r.status + '">' + REQ_LABEL[r.status] + "</span></div>" +
        (r.details ? '<p class="body">' + esc(r.details) + "</p>" : "") +
        (r.owner_reply ? '<div class="reply"><b>Declan replied</b>' + esc(r.owner_reply) + "</div>" : "") +
      "</article>";
    }).join("") : (state.sites.length ? '<div class="glass panel empty"><b>No requests yet</b>Need something updated? Send a request above and it\'s usually done within a few days.</div>' : '<div class="glass panel empty"><b>No requests yet</b>Once your website is set up, you can request changes here.</div>');
  }

  $("#request-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var row = {
      site_id: $("#rq-site").value,
      client_id: state.user.id,
      title: $("#rq-title").value.trim(),
      details: $("#rq-details").value.trim(),
      priority: $("#rq-priority").value,
    };
    if (!row.title) return toast("Add a short summary of the change.", "err");
    sb.from("change_requests").insert(row).select().single().then(function (res) {
      if (res.error) return toast(res.error.message, "err");
      state.requests.unshift(res.data);
      e.target.reset();
      renderRequests();
      toast("Request sent. Declan will be in touch.");
    });
  });

  $("#profile-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var changes = { full_name: $("#pf-name").value.trim(), business: $("#pf-business").value.trim(), phone: $("#pf-phone").value.trim() };
    sb.from("profiles").update(changes).eq("id", state.user.id).then(function (res) {
      if (res.error) return toast(res.error.message, "err");
      Object.assign(state.profile, changes);
      toast("Details saved");
    });
  });

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
