/**
 * Passcode session for the private /admin area.
 * Secrets come from environment variables only:
 *   ADMIN_PASSCODE        the passcode you type on the login page
 *   ADMIN_SESSION_SECRET  a long random string used to sign the session cookie
 * If either is missing, every admin request is refused.
 */
export const SESSION_COOKIE = "gv_admin";
export const SESSION_SECONDS = 60 * 60 * 12; // 12 hours

const encoder = new TextEncoder();

async function sign(message: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Constant-time string comparison. */
export function safeEqual(a: string, b: string): boolean {
  const x = encoder.encode(a);
  const y = encoder.encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  }
  return diff === 0;
}

export function adminConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSCODE && process.env.ADMIN_SESSION_SECRET);
}

export async function createSessionToken(): Promise<string> {
  const secret = process.env.ADMIN_SESSION_SECRET ?? "";
  const expires = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  return `${expires}.${await sign(String(expires), secret)}`;
}

export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!token || !secret) return false;
  const [expires, signature] = token.split(".");
  if (!expires || !signature || Number(expires) < Date.now() / 1000) return false;
  return safeEqual(signature, await sign(expires, secret));
}
