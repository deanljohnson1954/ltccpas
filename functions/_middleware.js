// Sends every request for the bare domain (ltccpas.com) to www.ltccpas.com with a
// permanent (301) redirect, keeping the path and query string, so search engines
// see one copy of each page. All other requests pass through unchanged.

export async function onRequest({ request, next }) {
  const url = new URL(request.url);
  if (url.hostname === "ltccpas.com") {
    url.hostname = "www.ltccpas.com";
    url.protocol = "https:";
    return Response.redirect(url.toString(), 301);
  }
  return next();
}
