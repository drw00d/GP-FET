// Cloudflare Pages Function — gates the ENTIRE site with a single shared
// username/password (HTTP Basic Auth). It runs on every request before any
// file (index.html, rates.json, everything) is served, so nothing is exposed
// to someone who hasn't logged in.
//
// The credentials are NOT stored here. Set them as encrypted environment
// variables on the Cloudflare Pages project:
//     SITE_USER  = the shared username
//     SITE_PASS  = the shared password
// (Cloudflare dashboard → your Pages project → Settings → Environment variables)

export async function onRequest(context) {
  const { request, env, next } = context;
  const USER = env.SITE_USER;
  const PASS = env.SITE_PASS;

  // Fail CLOSED: if the login isn't configured yet, deny rather than expose.
  if (!USER || !PASS) {
    return new Response("Site login is not configured yet.", { status: 503 });
  }

  if (isAuthorized(request.headers.get("Authorization"), USER, PASS)) {
    return next(); // correct login — serve the requested file
  }

  return new Response("Authentication required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="GP-FET", charset="UTF-8"',
      "Cache-Control": "no-store",
    },
  });
}

// Parse an "Authorization: Basic <base64(user:pass)>" header and compare.
// Password may contain ":" (we split on the first colon only).
function isAuthorized(header, user, pass) {
  if (!header || !header.startsWith("Basic ")) return false;
  let decoded;
  try {
    decoded = atob(header.slice(6).trim());
  } catch (_) {
    return false; // malformed base64
  }
  const i = decoded.indexOf(":");
  if (i < 0) return false;
  const u = decoded.slice(0, i);
  const p = decoded.slice(i + 1);
  return safeEqual(u, user) && safeEqual(p, pass);
}

// Length-checked, constant-time-ish comparison (avoids trivial timing leaks).
function safeEqual(a, b) {
  a = String(a);
  b = String(b);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let k = 0; k < a.length; k++) diff |= a.charCodeAt(k) ^ b.charCodeAt(k);
  return diff === 0;
}
