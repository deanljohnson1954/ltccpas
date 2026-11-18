// Contact form handler for LTCCPAs.com (Cloudflare Pages Function).
//
// Replaces the FormSubmit relay. For every valid submission it:
//   1. saves the submission in the SUBMISSIONS KV namespace (so nothing depends on email arriving),
//   2. emails a notification to Bert's practice inbox, sent from the site's own domain via Resend,
//   3. emails an acknowledgment to the person who wrote,
//   4. returns the visitor to /contact.html?sent=1.
//
// Cloudflare Pages settings required (Settings > Functions / Environment variables):
//   KV binding  SUBMISSIONS      -> a KV namespace, e.g. "ltccpas-submissions"
//   Secret      RESEND_API_KEY   -> API key from resend.com (domain ltccpas.com verified there)
//   Variable    NOTIFY_TO        -> withbert.payne@insurance-review-services.com
//   Variable    MAIL_FROM        -> LTCCPAs.com <inquiries@ltccpas.com>
//   Secret      ADMIN_PASSWORD   -> password for /admin/submissions (see functions/admin/submissions.js)

const FIELDS = {
  firstName: "First Name",
  lastName: "Last Name",
  phone: "Phone",
  email: "email",
  bestTime: "Best Time to Call",
  message: "Message",
};

const MAX_LEN = { firstName: 100, lastName: 100, phone: 40, email: 200, bestTime: 60, message: 5000 };

export async function onRequestPost({ request, env }) {
  let form;
  try {
    form = await request.formData();
  } catch {
    return errorPage("We couldn't read the form. Please try again.", 400);
  }

  // Honeypot: real visitors never fill this hidden field. Pretend success to bots.
  if ((form.get("website") || "").toString().trim() !== "") {
    return redirectToThanks(request);
  }

  const data = {};
  for (const [key, name] of Object.entries(FIELDS)) {
    data[key] = (form.get(name) || "").toString().trim().slice(0, MAX_LEN[key]);
  }

  if (!data.firstName || !data.lastName || !isEmail(data.email)) {
    return errorPage("Please go back and enter your first name, last name, and a valid email address.", 400);
  }

  const submittedAt = new Date().toISOString();
  const id = crypto.randomUUID();
  const record = {
    id,
    submittedAt,
    ...data,
    page: request.headers.get("Referer") || "",
    country: request.cf?.country || "",
    notification: "pending",
    acknowledgment: "pending",
  };

  // 1. Save first, so the inquiry exists even if every email fails.
  let saved = false;
  if (env.SUBMISSIONS) {
    try {
      await env.SUBMISSIONS.put(`submission:${submittedAt}:${id}`, JSON.stringify(record));
      saved = true;
    } catch (err) {
      console.error("KV save failed", err);
    }
  }

  // 2. Notify Bert. 3. Acknowledge the visitor.
  record.notification = await sendNotification(env, record);
  record.acknowledgment = await sendAcknowledgment(env, record);

  if (saved) {
    try {
      await env.SUBMISSIONS.put(`submission:${submittedAt}:${id}`, JSON.stringify(record));
    } catch (err) {
      console.error("KV status update failed", err);
    }
  }

  if (!saved && record.notification !== "sent") {
    // Nothing reached Bert by any route: tell the visitor the truth.
    return errorPage(
      "Your message could not be delivered. Please call Withbert directly at (925) 708-6501 or email withbert.payne@insurance-review-services.com.",
      502
    );
  }

  return redirectToThanks(request);
}

async function sendNotification(env, r) {
  const subject = `New policy review request: ${r.firstName} ${r.lastName}`;
  const rows = [
    ["Name", `${r.firstName} ${r.lastName}`],
    ["Email", r.email],
    ["Phone", r.phone || "(not given)"],
    ["Best time to call", r.bestTime || "(not given)"],
    ["Message", r.message || "(none)"],
    ["Received", formatPacific(r.submittedAt)],
    ["Reference", r.id],
  ];
  const html =
    `<p>A new request came in through the contact form on LTCCPAs.com.</p>` +
    `<table cellpadding="6" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px">` +
    rows
      .map(
        ([k, v]) =>
          `<tr><td style="border:1px solid #ddd;font-weight:bold;vertical-align:top">${esc(k)}</td>` +
          `<td style="border:1px solid #ddd;white-space:pre-wrap">${esc(v)}</td></tr>`
      )
      .join("") +
    `</table><p style="font-size:12px;color:#666">Reply to this email to answer ${esc(r.firstName)} directly.</p>`;
  const text = rows.map(([k, v]) => `${k}: ${v}`).join("\n");
  return sendEmail(env, {
    to: [env.NOTIFY_TO || "withbert.payne@insurance-review-services.com"],
    reply_to: r.email,
    subject,
    html,
    text,
  });
}

async function sendAcknowledgment(env, r) {
  const subject = "We received your request — LTCCPAs.com";
  const text =
    `Dear ${r.firstName},\n\n` +
    `Thank you for contacting LTCCPAs.com. Your request for a policy review has been received, ` +
    `and Withbert Payne will be in touch within one business day.\n\n` +
    `If you would like to reach him sooner, please call (925) 708-6501 or reply to this email.\n\n` +
    `Withbert W. Payne, CPA, CGMA, FCA\n` +
    `Insurance Review Services · LTCCPAs.com\n` +
    `CA License No. 0E90257\n`;
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5">${esc(text).replace(/\n/g, "<br>")}</div>`;
  return sendEmail(env, {
    to: [r.email],
    reply_to: env.NOTIFY_TO || "withbert.payne@insurance-review-services.com",
    subject,
    html,
    text,
  });
}

async function sendEmail(env, message) {
  if (!env.RESEND_API_KEY) return "not configured";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: env.MAIL_FROM || "LTCCPAs.com <inquiries@ltccpas.com>", ...message }),
    });
    if (res.ok) return "sent";
    console.error("Resend error", res.status, await res.text());
    return `failed (${res.status})`;
  } catch (err) {
    console.error("Resend request failed", err);
    return "failed";
  }
}

function redirectToThanks(request) {
  const url = new URL("/contact.html?sent=1", request.url);
  return Response.redirect(url.toString(), 303);
}

function errorPage(message, status) {
  const body =
    `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">` +
    `<title>Message not sent — LTCCPAs.com</title></head>` +
    `<body style="font-family:Arial,sans-serif;max-width:560px;margin:60px auto;padding:0 20px;color:#1E3A5F">` +
    `<h1 style="font-size:22px">Your message was not sent</h1><p>${esc(message)}</p>` +
    `<p><a href="/contact.html">Return to the contact page</a></p></body></html>`;
  return new Response(body, { status, headers: { "Content-Type": "text/html; charset=UTF-8" } });
}

function isEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatPacific(iso) {
  return new Date(iso).toLocaleString("en-US", { timeZone: "America/Los_Angeles", dateStyle: "medium", timeStyle: "short" }) + " Pacific";
}
