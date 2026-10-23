// Chat thread between the owner and one client. Shared by the owner panel and the client portal.
// Live updates come from Supabase Realtime, with a slower poll as a fallback.
(function () {
  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  // Turn plain links into clickable ones (text is escaped first)
  function linkify(text) {
    return esc(text).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>').replace(/\n/g, "<br>");
  }
  function dayLabel(d) {
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var day = new Date(d); day.setHours(0, 0, 0, 0);
    var diff = Math.round((today - day) / 86400000);
    if (diff === 0) return "Today";
    if (diff === 1) return "Yesterday";
    return d.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });
  }
  var POLL_MS = window.MWC_POLL_MS || 15000;

  // opts: { sb, root, clientId, meId, otherName, onActivity }
  function Thread(opts) {
    var self = this;
    this.opts = opts;
    this.messages = [];
    opts.root.innerHTML =
      '<div class="chat"><div class="chat-head"><div class="chat-avatar">' + esc((opts.otherName || "?").charAt(0).toUpperCase()) + '</div><div><b>' + esc(opts.otherName || "") + '</b><span class="chat-sub">' + esc(opts.subtitle || "") + "</span></div></div>" +
      '<div class="chat-scroll" role="log" aria-live="polite"></div>' +
      '<form class="chat-compose"><textarea rows="1" maxlength="4000" placeholder="Write a message…" aria-label="Message"></textarea><button class="btn btn-primary" type="submit" aria-label="Send"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/></svg></button></form></div>';
    this.scroll = opts.root.querySelector(".chat-scroll");
    this.input = opts.root.querySelector("textarea");
    var form = opts.root.querySelector("form");

    form.addEventListener("submit", function (e) { e.preventDefault(); self.send(); });
    this.input.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); self.send(); }
    });
    this.input.addEventListener("input", function () {
      self.input.style.height = "auto";
      self.input.style.height = Math.min(self.input.scrollHeight, 160) + "px";
    });

    this.load();
    this.channel = opts.sb.channel("chat-" + opts.clientId + "-" + Math.random().toString(36).slice(2, 7))
      .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: "client_id=eq." + opts.clientId }, function () { self.load(); })
      .subscribe();
    this.timer = setInterval(function () { self.load(); }, POLL_MS);
  }

  Thread.prototype.load = function () {
    var self = this;
    return this.opts.sb.from("messages").select("*").eq("client_id", this.opts.clientId).order("created_at").then(function (res) {
      if (res.error || self.destroyed) return;
      var before = self.messages.length;
      self.messages = res.data;
      self.render(res.data.length !== before);
      self.markRead();
    });
  };

  Thread.prototype.render = function (scrollToEnd) {
    var me = this.opts.meId, lastDay = "", html = "";
    var lastMine = null;
    this.messages.forEach(function (m) { if (m.sender_id === me) lastMine = m; });
    if (!this.messages.length) {
      html = '<div class="chat-empty"><b>Start the conversation</b>' + esc(this.opts.emptyText || "Messages you send appear here.") + "</div>";
    }
    this.messages.forEach(function (m) {
      var d = new Date(m.created_at);
      var label = dayLabel(d);
      if (label !== lastDay) { html += '<div class="chat-day">' + label + "</div>"; lastDay = label; }
      var mine = m.sender_id === me;
      html += '<div class="bubble-row' + (mine ? " mine" : "") + '"><div class="bubble">' + linkify(m.body) +
        '<span class="time">' + d.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" }) + "</span></div>" +
        (m === lastMine && m.read_at ? '<span class="seen">Seen</span>' : "") + "</div>";
    });
    var nearBottom = this.scroll.scrollHeight - this.scroll.scrollTop - this.scroll.clientHeight < 120;
    this.scroll.innerHTML = html;
    if (scrollToEnd || nearBottom) this.scroll.scrollTop = this.scroll.scrollHeight;
  };

  Thread.prototype.markRead = function () {
    var self = this, me = this.opts.meId;
    if (document.hidden || !this.opts.root.offsetParent) return;
    var unread = this.messages.filter(function (m) { return m.sender_id !== me && !m.read_at; }).map(function (m) { return m.id; });
    if (!unread.length) return;
    this.opts.sb.from("messages").update({ read_at: new Date().toISOString() }).in("id", unread).then(function () {
      if (self.opts.onActivity) self.opts.onActivity();
    });
  };

  Thread.prototype.send = function () {
    var self = this;
    var body = this.input.value.trim();
    if (!body) return;
    this.input.value = "";
    this.input.style.height = "auto";
    this.opts.sb.from("messages").insert({ client_id: this.opts.clientId, sender_id: this.opts.meId, body: body }).then(function (res) {
      if (res.error) {
        self.input.value = body;
        if (self.opts.onError) self.opts.onError("Message not sent: " + res.error.message);
        return;
      }
      self.load().then(function () { self.scroll.scrollTop = self.scroll.scrollHeight; });
      if (self.opts.onActivity) self.opts.onActivity();
    });
  };

  Thread.prototype.destroy = function () {
    this.destroyed = true;
    clearInterval(this.timer);
    if (this.channel) this.opts.sb.removeChannel(this.channel);
  };

  window.MWCChat = { Thread: Thread, esc: esc };
})();
