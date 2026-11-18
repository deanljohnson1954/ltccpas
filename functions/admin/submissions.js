// Private list of every contact-form submission, newest first.
// Open https://www.ltccpas.com/admin/submissions and sign in with any username
// and the ADMIN_PASSWORD set in Cloudflare Pages. Add ?format=csv to download a spreadsheet.

export async function onRequestGet({ request, env }) {
  if (!env.ADMIN_PASSWORD || !authorized(request, env.ADMIN_PASSWORD)) {
    return new Response("Sign-in required.", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="LTCCPAs.com submissions", charset="UTF-8"' },
    });
  }
  if (!env.SUBMISSIONS) return new Response("Submission storage is not configured.", { status: 500 });

  const records = [];
  let cursor;
  do {
    const page = await env.SUBMISSIONS.list({ prefix: "submission:", cursor });
    for (const key of page.keys) {
      const value = await env.SUBMISSIONS.get(key.name);
      if (value) records.push(JSON.parse(value));
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  records.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));

  const cols = ["submittedAt", "firstName", "lastName", "email", "phone", "bestTime", "message", "notification", "acknowledgment", "id"];
  const headers = ["Received (UTC)", "First name", "Last name", "Email", "Phone", "Best time", "Message", "Notice to Bert", "Acknowledgment", "Reference"];

  if (new URL(request.url).searchParams.get("format") === "csv") {
    const csv = [headers, ...records.map((r) => cols.map((c) => r[c] ?? ""))]
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\r\n");
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=UTF-8",
        "Content-Disposition": 'attachment; filename="ltccpas-submissions.csv"',
        "Cache-Control": "no-store",
      },
    });
  }

  const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const body =
    `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="robots" content="noindex, nofollow">` +
    `<meta name="viewport" content="width=device-width, initial-scale=1"><title>Contact form submissions — LTCCPAs.com</title>` +
    `<style>body{font-family:Arial,sans-serif;margin:24px;color:#1E3A5F}table{border-collapse:collapse;width:100%;font-size:13px}` +
    `th,td{border:1px solid #ccc;padding:6px;vertical-align:top;text-align:left}th{background:#1E3A5F;color:#fff}td.msg{white-space:pre-wrap;max-width:420px}</style></head><body>` +
    `<h1 style="font-size:20px">Contact form submissions (${records.length})</h1>` +
    `<p><a href="?format=csv">Download as a spreadsheet (CSV)</a></p>` +
    `<table><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr>` +
    records
      .map((r) => `<tr>${cols.map((c) => `<td${c === "message" ? ' class="msg"' : ""}>${esc(r[c])}</td>`).join("")}</tr>`)
      .join("") +
    `</table></body></html>`;
  return new Response(body, { headers: { "Content-Type": "text/html; charset=UTF-8", "Cache-Control": "no-store" } });
}

function authorized(request, password) {
  const header = request.headers.get("Authorization") || "";
  if (!header.startsWith("Basic ")) return false;
  try {
    const decoded = atob(header.slice(6));
    const supplied = decoded.slice(decoded.indexOf(":") + 1);
    return timingSafeEqual(supplied, password);
  } catch {
    return false;
  }
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
