// Contact form handler (Cloudflare Pages Function at /api/contact).
// Receives the contact form, emails it to Bert through Resend (resend.com),
// then sends the visitor back to /contact?sent=1 (or ?error=1 if sending failed).
//
// Settings, kept in Cloudflare Pages > Settings > Variables and Secrets (never in this repo):
//   RESEND_API_KEY  (required, mark as Secret) API key from resend.com > API Keys
//   CONTACT_TO      (optional) recipient; defaults to Bert's address below
//   CONTACT_FROM    (optional) sender; must be on a domain verified in Resend

const DEFAULT_TO = "withbert.payne@insurance-review-services.com";
const DEFAULT_FROM = "LTCCPAs.com Website <website@ltccpas.com>";

const FIELDS = [
  ["First Name", "fname"],
  ["Last Name", "lname"],
  ["Phone", "phone"],
  ["Email", "email"],
  ["Best Time to Call", "best_time"],
  ["Message", "message"],
];

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function back(request, query) {
  return Response.redirect(new URL("/contact?" + query, request.url).toString(), 303);
}

export async function onRequestPost({ request, env }) {
  let form;
  try {
    form = await request.formData();
  } catch {
    return back(request, "error=1");
  }

  // Honeypot: real visitors never fill this hidden field. Pretend success to bots.
  if ((form.get("_honey") || "").trim()) return back(request, "sent=1");

  const data = {};
  for (const [label, key] of FIELDS) data[key] = String(form.get(key) || "").trim().slice(0, 5000);

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email);
  if (!data.fname || !data.lname || !emailOk) return back(request, "error=1");

  if (!env.RESEND_API_KEY) {
    console.error("RESEND_API_KEY is not set");
    return back(request, "error=1&code=nokey");
  }

  const rows = FIELDS.map(([label, key]) =>
    `<tr><td style="padding:8px 12px;background:#FAF4E8;font-weight:600;color:#1E3A5F;vertical-align:top;white-space:nowrap;">${esc(label)}</td>` +
    `<td style="padding:8px 12px;color:#222;white-space:pre-wrap;">${esc(data[key] || "-")}</td></tr>`
  ).join("");
  const html =
    `<div style="font-family:Arial,sans-serif;font-size:15px;">` +
    `<p>New policy review request from the LTCCPAs.com contact form:</p>` +
    `<table style="border-collapse:collapse;border:1px solid #D7DEE8;">${rows}</table>` +
    `<p style="color:#666;font-size:13px;">Reply to this email to respond directly to ${esc(data.fname)}.</p></div>`;
  const text = FIELDS.map(([label, key]) => `${label}: ${data[key] || "-"}`).join("\n");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: env.CONTACT_FROM || DEFAULT_FROM,
      to: [env.CONTACT_TO || DEFAULT_TO],
      reply_to: data.email,
      subject: `New LTC Inquiry: ${data.fname} ${data.lname} (LTCCPAs.com)`,
      html,
      text,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    console.error("Resend error", res.status, detail);
    let name = "";
    try { name = (JSON.parse(detail).name || "").replace(/[^a-z_]/gi, "").slice(0, 40); } catch {}
    return back(request, `error=1&code=${res.status}${name ? "-" + name : ""}`);
  }
  return back(request, "sent=1");
}

// Anyone opening /api/contact directly is sent to the contact page.
export function onRequestGet({ request }) {
  return Response.redirect(new URL("/contact", request.url).toString(), 302);
}
