// Share a design by private review link: copy, email (opens your email app) or text it. Used by the owner panel and the builder.
(function () {
  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function reviewUrl(design) {
    var base = window.location.href.replace(/[^/]*$/, "");
    return base + "review.html?t=" + encodeURIComponent(design.share_token);
  }

  var dialog;
  function build() {
    dialog = document.createElement("dialog");
    dialog.className = "editor";
    dialog.style.width = "min(600px,94vw)";
    dialog.setAttribute("aria-labelledby", "share-title");
    dialog.innerHTML =
      '<form class="editor-form" method="dialog">' +
        '<div class="panel-head" style="margin:0"><h2 id="share-title" style="margin:0">Send design</h2><button class="icon-btn" value="close" aria-label="Close">✕</button></div>' +
        '<p class="muted" id="share-sub" style="margin:0"></p>' +
        '<div class="two"><div><label for="share-name">Their name</label><input id="share-name" maxlength="120" placeholder="e.g. Jess"></div>' +
        '<div><label for="share-email">Their email</label><input id="share-email" type="email" maxlength="200" placeholder="name@business.com"></div></div>' +
        '<div><label for="share-link">Private review link</label><div style="display:flex;gap:8px"><input id="share-link" readonly><button type="button" class="btn btn-glass btn-sm" id="share-copy">Copy</button></div>' +
        '<p class="hint">Anyone with this link can view the design and approve it or request changes. No account needed.</p></div>' +
        '<div><label for="share-note">Personal note in the email (optional)</label><textarea id="share-note" maxlength="1500" rows="3" placeholder="e.g. Great chatting on the phone today. Here\'s the redesign I mentioned."></textarea></div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
          '<button type="button" class="btn btn-primary" id="share-send">✉️ Email it</button>' +
          '<a class="btn btn-glass" id="share-sms-btn" href="#">💬 Text it</a>' +
          '<a class="btn btn-glass" id="share-open" href="#" target="_blank" rel="noopener">Open link ↗</a>' +
        "</div>" +
        '<p class="hint" id="share-sent" role="status" style="margin:0"></p>' +
        '<div class="editor-actions"><button type="button" class="btn btn-danger btn-sm" id="share-stop">Stop sharing</button><span class="hint" id="share-state"></span></div>' +
      "</form>";
    document.body.appendChild(dialog);
  }

  // opts: { sb, design, onChange, toast }
  function open(opts) {
    if (!dialog) build();
    var d = opts.design;
    var $ = function (id) { return dialog.querySelector("#" + id); };
    var theme = d.theme || (d.content && d.content.theme) || {};
    var business = theme.business || d.prospect_name || "your business";
    $("share-sub").textContent = '"' + d.name + '"' + (d.client_id ? "" : " · not linked to a client account yet");
    $("share-name").value = d.prospect_contact || "";
    $("share-email").value = d.prospect_email || "";
    $("share-state").textContent = "Activating link…";
    $("share-note").value = "";
    $("share-sent").textContent = "";
    $("share-send").disabled = false;
    // Show when this design was last emailed
    opts.sb.from("design_emails").select("to_email,status,created_at").eq("design_id", d.id).eq("kind", "share").order("created_at", { ascending: false }).limit(1).then(function (res) {
      var last = res.data && res.data[0];
      if (last && !$("share-sent").textContent) $("share-sent").textContent = "Last emailed to " + last.to_email + " · " + new Date(last.created_at).toLocaleString("en-AU", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
    });

    function refreshLinks() {
      var link = reviewUrl(d);
      var first = ($("share-name").value.trim().split(" ")[0]) || "there";
      $("share-link").value = link;
      $("share-open").href = link;
      $("share-sms-btn").href = "sms:?&body=" + encodeURIComponent("Hi " + first + ", here's the new website design for " + business + ": " + link);
    }

    // Turn the link on and mark the design as with the client
    var changes = { shared: true };
    // A draft goes out for review; after requested changes, sharing again starts a new review round
    if (d.status === "draft" || d.status === "changes_requested") { changes.status = "in_review"; changes.sent_at = new Date().toISOString(); changes.client_feedback = ""; }
    var activated = opts.sb.from("designs").update(changes).eq("id", d.id).then(function (res) {
      if (res.error) { $("share-state").textContent = "Couldn't activate the link: " + res.error.message; return false; }
      Object.assign(d, changes);
      $("share-state").textContent = "Link is live · status: " + (d.status === "in_review" ? "waiting for review" : d.status.replace("_", " "));
      if (opts.onChange) opts.onChange(d);
      return true;
    });

    // Open the email, written and ready, in your own email app, and note it in the Sent history
    $("share-send").onclick = function () {
      var to = $("share-email").value.trim(), name = $("share-name").value.trim(), note = $("share-note").value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(to)) { $("share-sent").textContent = "Add their email address first."; $("share-email").focus(); return; }
      activated.then(function (ok) {
        if (ok === false) { $("share-sent").textContent = "The link isn't active yet, so there's nothing to send."; return; }
        var mail = compose({ kind: "share", design: d, name: name, note: note });
        logEmail(opts.sb, { design_id: d.id, kind: "share", to_email: to, to_name: name });
        var c = { prospect_contact: name, prospect_email: to };
        opts.sb.from("designs").update(c).eq("id", d.id).then(function (res) { if (!res.error) { Object.assign(d, c); if (opts.onChange) opts.onChange(d); } });
        $("share-sent").textContent = "✓ Opening your email app with the email to " + to + " written. Just press send.";
        window.MWCShare.openEmail(to, mail.subject, mail.body);
      });
    };

    var saveTimer;
    dialog.oninput = function (e) {
      if (e.target.id !== "share-name" && e.target.id !== "share-email") return;
      refreshLinks();
      clearTimeout(saveTimer);
      saveTimer = setTimeout(function () {
        var c = { prospect_contact: $("share-name").value.trim(), prospect_email: $("share-email").value.trim() };
        opts.sb.from("designs").update(c).eq("id", d.id).then(function (res) { if (!res.error) { Object.assign(d, c); if (opts.onChange) opts.onChange(d); } });
      }, 600);
    };
    $("share-copy").onclick = function () {
      var input = $("share-link");
      input.select();
      (navigator.clipboard ? navigator.clipboard.writeText(input.value) : Promise.reject()).then(
        function () { if (opts.toast) opts.toast("Link copied"); },
        function () { document.execCommand("copy"); if (opts.toast) opts.toast("Link copied"); }
      );
    };
    $("share-stop").onclick = function () {
      opts.sb.from("designs").update({ shared: false }).eq("id", d.id).then(function (res) {
        if (res.error) return opts.toast && opts.toast(res.error.message, "err");
        d.shared = false;
        if (opts.onChange) opts.onChange(d);
        if (opts.toast) opts.toast("Link turned off. It won't open any more.");
        dialog.close();
      });
    };
    refreshLinks();
    dialog.showModal();
  }

  // The email you send: a short, friendly note with the link. Used by the share dialog, the builder and the Send page.
  // opts: { kind: "share" | "portal", design, name, note }
  function compose(o) {
    var d = o.design;
    var theme = d.theme || (d.content && d.content.theme) || {};
    var business = theme.business || d.prospect_name || "your business";
    var first = (String(o.name || "").trim().split(/\s+/)[0]) || "there";
    var portal = o.kind === "portal";
    var link = portal ? window.location.href.replace(/[^/]*$/, "") + "account.html" : reviewUrl(d);
    var subject = portal ? "New design to review: " + d.name : "Your new website design: " + business;
    var body = "Hi " + first + ",\n\n" +
      (portal ? "I've sent you a new website design to review: \"" + d.name + "\". Sign in to your client portal to have a look:" :
        "I've put together a refreshed website design for " + business + ". Have a look here and click around, it works on your phone too:") +
      "\n" + link + (o.note ? "\n\n" + o.note : "") +
      "\n\n" + (portal ? "You can approve it or ask for changes from your portal, and message me there any time." : "You can approve it or tell me what you'd like changed right on that page.") +
      "\n\nCheers,\nDeclan\nMarshall Web Co.";
    return { subject: subject, body: body, link: link };
  }
  function openEmail(to, subject, body) {
    window.location.href = "mailto:" + encodeURIComponent(to) + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
  }
  function logEmail(sb, row) { return sb.from("design_emails").insert(row).then(function (res) { return res; }); }

  window.MWCShare = { open: open, reviewUrl: reviewUrl, compose: compose, openEmail: openEmail, logEmail: logEmail, esc: esc };
})();
