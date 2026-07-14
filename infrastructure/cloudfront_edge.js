// Viewer-request auth gate. Verifies the Firebase ID token carried in the `id_token` cookie:
// RS256 signature against Google's securetoken certs, issuer/audience/expiry claims, then the
// email against the baked-in allowlist. Outcomes:
//   - no/invalid/expired token → 302 /login.html            (the login page silently refreshes the
//                                                            cookie from the Firebase session and
//                                                            bounces back — no popup)
//   - valid token, email not allowed → 302 /login.html?denied=1  (login page signs out + explains,
//                                                                 so this can never redirect-loop)
//   - valid + allowed → pass through to S3
//
// This file is rendered by Terraform templatefile() — keep it free of "$${" and "%%{" sequences
// (no JS template literals), and edit the allowlist via var.allowed_emails, not here.

import crypto from "node:crypto";

const PROJECT_ID = "your-project-id";
const ISSUER = "https://securetoken.google.com/" + PROJECT_ID;
const CERTS_URL = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";

// Rendered from var.allowed_emails (lowercased) by Terraform.
const ALLOWED_EMAILS = ${allowed_emails_json};

const publicPaths = [
  "/login.html",
  "/favicon*",
  "/logo*",
  "/manifest*",
  "/robots.txt"
];

function isPublicPath(uri) {
  return publicPaths.some(pattern => {
    const regexPattern = '^' + pattern
      .replace(/[-/\\^$+?.()|[\]{}]/g, '\\$&') // escape regex meta chars
      .replace(/\*/g, '.*') + '$';             // convert * → .*
    return new RegExp(regexPattern).test(uri);
  });
}

// Google rotates these certs; honor the Cache-Control max-age they send. The cache lives for the
// lifetime of the Lambda@Edge sandbox, so most requests verify without any network call.
let certCache = { certs: null, expiresAt: 0 };

async function getCerts() {
  if (certCache.certs && Date.now() < certCache.expiresAt) return certCache.certs;
  const res = await fetch(CERTS_URL);
  if (!res.ok) throw new Error("cert fetch failed: " + res.status);
  const certs = await res.json();
  const cc = res.headers.get("cache-control") || "";
  const m = cc.match(/max-age=(\d+)/);
  const ttlMs = (m ? parseInt(m[1], 10) : 3600) * 1000;
  certCache = { certs, expiresAt: Date.now() + ttlMs };
  return certs;
}

function b64url(s) {
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

// → "ok" | "invalid" | "denied"
async function checkToken(token) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return "invalid";
    const header = JSON.parse(b64url(parts[0]).toString("utf8"));
    const payload = JSON.parse(b64url(parts[1]).toString("utf8"));
    if (header.alg !== "RS256" || typeof header.kid !== "string") return "invalid";

    const certs = await getCerts();
    const pem = certs[header.kid];
    if (!pem) return "invalid";
    const publicKey = new crypto.X509Certificate(pem).publicKey;
    const signed = Buffer.from(parts[0] + "." + parts[1]);
    if (!crypto.verify("RSA-SHA256", signed, publicKey, b64url(parts[2]))) return "invalid";

    const now = Math.floor(Date.now() / 1000);
    if (typeof payload.exp !== "number" || payload.exp <= now) return "invalid";
    if (typeof payload.iat !== "number" || payload.iat > now + 300) return "invalid";
    if (payload.aud !== PROJECT_ID || payload.iss !== ISSUER) return "invalid";
    if (typeof payload.sub !== "string" || payload.sub.length === 0) return "invalid";

    const email = typeof payload.email === "string" ? payload.email.toLowerCase() : "";
    return ALLOWED_EMAILS.indexOf(email) >= 0 ? "ok" : "denied";
  } catch (e) {
    console.error("id_token verification error:", e && e.message);
    return "invalid";
  }
}

function redirectToLogin(host, denied) {
  return {
    status: "302",
    headers: {
      location: [{ key: "Location", value: "https://" + host + "/login.html" + (denied ? "?denied=1" : "") }],
      // Never let a redirect be cached: a cached 302 would keep bouncing a freshly signed-in user.
      "cache-control": [{ key: "Cache-Control", value: "no-store" }]
    }
  };
}

export const handler = async (event) => {
  const request = event.Records[0].cf.request;
  const headers = request.headers;

  if (isPublicPath(request.uri)) return request;

  const host = headers.host[0].value;
  const cookies = (headers.cookie || []).map(c => c.value).join("; ");
  const tokenMatch = cookies.match(/id_token=([^;\s]+)/);
  if (!tokenMatch) return redirectToLogin(host, false);

  const result = await checkToken(tokenMatch[1]);
  if (result === "ok") return request;
  return redirectToLogin(host, result === "denied");
};
