export const SESSION_COOKIE_NAME = "session_token";
const DEFAULT_SECRET = "temp-dev-session-secret-change-me-in-production";

function getSecretKey(env) {
  return env.SESSION_SECRET?.trim().replace(/^["']|["']$/g, "") || DEFAULT_SECRET;
}

async function getCryptoKey(secret) {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  return await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

async function generateSignature(data, secret) {
  const key = await getCryptoKey(secret);
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, dataBuffer);
  
  return Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function createSessionToken(env) {
  const expiry = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const payload = expiry.toString();
  const secret = getSecretKey(env);
  const signature = await generateSignature(payload, secret);
  
  return `${payload}.${signature}`;
}

export async function verifySessionToken(token, env) {
  if (!token) return false;
  
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  
  const [expiryStr, signature] = parts;
  const expiry = parseInt(expiryStr, 10);
  
  if (isNaN(expiry) || expiry < Date.now()) {
    return false;
  }
  
  const secret = getSecretKey(env);
  const expectedSignature = await generateSignature(expiryStr, secret);
  
  return signature === expectedSignature;
}

export function getCookie(request, name) {
  const cookieHeader = request.headers.get("Cookie");
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(";").map(c => c.trim());
  for (const cookie of cookies) {
    const [key, value] = cookie.split("=");
    if (key === name) {
      return decodeURIComponent(value);
    }
  }
  return null;
}
