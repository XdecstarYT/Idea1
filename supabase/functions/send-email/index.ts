// Sends a design to a client or prospect by email, from the owner panel and the builder.
// Only the owner (a row in public.admins) can call it. Email goes out through Brevo (free: 300 emails a day).
//
// Secrets (Supabase dashboard → Edge Functions → Secrets):
//   BREVO_API_KEY  your Brevo API key (required; without it the app falls back to opening your email app)
//   SENDER_EMAIL   the verified sender address in Brevo (default decmar098@gmail.com)
//   SENDER_NAME    shown as the sender (default "Declan · Marshall Web Co.")
//   SITE_URL       your website (default https://marshallwebz.netlify.app)
//
// Body: { kind: "share" | "portal", designId, to?, name?, note? }
//   share  → emails the private review link (review.html?t=…) to `to`
//   portal → emails the client linked to the design, pointing them to their portal

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const esc = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const EMAIL = /^[^\s@<>"]+@[^\s@<>"]+\.[a-z]{2,}$/i;

// The design's first big photo, for the email preview
function coverImage(content: any): string {
  const blocks: any[] = Array.isArray(content?.pages) ? (content.pages[0]?.blocks || []) : (content?.blocks || []);
  for (const b of blocks) {
    const src = b.type === "billboard" ? b.slides?.[0]?.image : b.type === "hero" || b.type === "pagehead" ? b.image : "";
    if (typeof src === "string" && /^https:\/\/[^\s"'<>]+$/.test(src)) return src;
  }
  return "";
}

function emailHtml(o: { first: string; business: string; intro: string; note: string; link: string; button: string; image: string; from: string; footnote: string }) {
  return `<!doctype html><html><body style="margin:0;background:#f3f1ec;font-family:Helvetica,Arial,sans-serif;color:#1b1f2a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f1ec;padding:28px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden">
<tr><td style="background:#14213d;padding:18px 28px;color:#d4ad3a;font-weight:700;font-size:15px;letter-spacing:.04em">MARSHALL WEB CO.</td></tr>
${o.image ? `<tr><td><a href="${esc(o.link)}"><img src="${esc(o.image)}" width="600" alt="Preview of the ${esc(o.business)} website design" style="display:block;width:100%;max-height:340px;object-fit:cover;border:0"></a></td></tr>` : ""}
<tr><td style="padding:30px 28px 8px">
<h1 style="margin:0 0 14px;font-size:24px;line-height:1.25">Hi ${esc(o.first)},</h1>
<p style="margin:0 0 14px;font-size:16px;line-height:1.6">${esc(o.intro)}</p>
${o.note ? `<p style="margin:0 0 14px;font-size:16px;line-height:1.6;padding:14px 16px;background:#f6f5f1;border-left:3px solid #d4ad3a;border-radius:6px">${esc(o.note).replace(/\n/g, "<br>")}</p>` : ""}
<p style="margin:22px 0 26px"><a href="${esc(o.link)}" style="display:inline-block;background:#d4ad3a;color:#14213d;text-decoration:none;font-weight:700;font-size:16px;padding:14px 26px;border-radius:10px">${esc(o.button)}</a></p>
<p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:#5b6170">${esc(o.footnote)}</p>
</td></tr>
<tr><td style="padding:18px 28px 28px;font-size:14px;line-height:1.6;color:#5b6170">Cheers,<br><b style="color:#1b1f2a">${esc(o.from)}</b><br>Marshall Web Co. · Warrnambool<br><a href="mailto:${esc(Deno.env.get("SENDER_EMAIL") || "decmar098@gmail.com")}" style="color:#14213d">Reply to this email</a> any time.</td></tr>
</table>
<p style="font-size:12px;color:#8a8f99;margin:16px 0 0">If the button doesn't work, copy this link: ${esc(o.link)}</p>
</td></tr></table></body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const asUser = createClient(url, anon, { global: { headers: { Authorization: req.headers.get("Authorization") || "" } } });
  const db = createClient(url, service);

  // Owner only
  const { data: who } = await asUser.auth.getUser();
  if (!who?.user) return json({ error: "not_signed_in" }, 401);
  const { data: admin } = await db.from("admins").select("user_id").eq("user_id", who.user.id).maybeSingle();
  if (!admin) return json({ error: "owner_only" }, 403);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "bad_request" }, 400); }
  const kind = body.kind === "portal" ? "portal" : "share";
  const { data: design } = await db.from("designs").select("id,name,content,client_id,prospect_name,share_token,shared").eq("id", body.designId).maybeSingle();
  if (!design) return json({ error: "design_not_found" }, 404);

  const site = (Deno.env.get("SITE_URL") || "https://marshallwebz.netlify.app").replace(/\/+$/, "");
  const business = design.content?.theme?.business || design.prospect_name || "your business";
  let to = String(body.to || "").trim(), name = String(body.name || "").trim();
  if (kind === "portal") {
    const { data: client } = await db.from("profiles").select("email,full_name").eq("id", design.client_id).maybeSingle();
    if (!client?.email) return json({ error: "client_has_no_email" }, 400);
    to = client.email; name = name || client.full_name || "";
  } else if (!design.shared || !design.share_token) return json({ error: "link_not_shared" }, 400);
  if (!EMAIL.test(to)) return json({ error: "bad_email" }, 400);

  const key = Deno.env.get("BREVO_API_KEY");
  if (!key) return json({ error: "not_configured" }, 503);

  const first = name.split(/\s+/)[0] || "there";
  const fromName = Deno.env.get("SENDER_NAME") || "Declan · Marshall Web Co.";
  const link = kind === "portal" ? `${site}/account.html` : `${site}/review.html?t=${encodeURIComponent(design.share_token)}`;
  const intro = kind === "portal"
    ? `I've sent you a new website design to review: "${design.name}". Sign in to your client portal to have a look and let me know what you think.`
    : `I've put together a refreshed website design for ${business}. Have a look at it here and click around: every page works.`;
  const note = String(body.note || "").slice(0, 1500);
  const subject = kind === "portal" ? `New design to review: ${design.name}` : `Your new website design: ${business}`;
  const text = `Hi ${first},\n\n${intro}\n\n${note ? note + "\n\n" : ""}${link}\n\n${kind === "portal" ? "Sign in to approve it or ask for changes." : "You can approve it or ask for changes right on that page."}\n\nCheers,\n${fromName}`;

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": key, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      sender: { name: fromName, email: Deno.env.get("SENDER_EMAIL") || "decmar098@gmail.com" },
      to: [{ email: to, name: name || undefined }],
      replyTo: { email: Deno.env.get("SENDER_EMAIL") || "decmar098@gmail.com", name: fromName },
      subject,
      htmlContent: emailHtml({ first, business, intro, note, link, button: kind === "portal" ? "Open my portal" : "View your new website", image: coverImage(design.content), from: fromName.split(" ·")[0], footnote: kind === "portal" ? "Your portal also shows your website's progress and lets you message me directly." : "It works on your phone too. You can approve it or ask for changes right on that page, no account needed." }),
      textContent: text,
    }),
  });
  const out = await res.json().catch(() => ({}));
  const ok = res.ok;
  await db.from("design_emails").insert({ design_id: design.id, kind, to_email: to, to_name: name || null, status: ok ? "sent" : "failed", error: ok ? null : String(out.message || res.status).slice(0, 500), provider_id: out.messageId || null, sent_by: who.user.id });
  if (!ok) return json({ error: "send_failed", detail: out.message || "The email service refused the message." }, 502);
  return json({ ok: true, to });
});
