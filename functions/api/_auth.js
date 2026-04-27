const encoder = new TextEncoder();
const SESSION_COOKIE = "apmicro_session";
const SESSION_DAYS = 30;

export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...extraHeaders
    }
  });
}

export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

export function validateUsername(username) {
  return /^[a-zA-Z0-9_]{3,24}$/.test(username || "");
}

export function validatePassword(password) {
  return typeof password === "string" && password.length >= 8 && password.length <= 128;
}

export function randomHex(bytes = 32) {
  const data = new Uint8Array(bytes);
  crypto.getRandomValues(data);
  return [...data].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function sha256Hex(value) {
  const hash = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function hashPassword(password, salt) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: encoder.encode(salt), iterations: 120000, hash: "SHA-256" },
    key,
    256
  );
  return [...new Uint8Array(bits)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function sessionCookie(token) {
  const maxAge = SESSION_DAYS * 24 * 60 * 60;
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export function getCookie(request, name) {
  const cookie = request.headers.get("cookie") || "";
  const match = cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : "";
}

export async function createSession(env, userId) {
  const token = randomHex(32);
  const tokenHash = await sha256Hex(token);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  await env.DB.prepare("INSERT INTO sessions (user_id, token_hash, expires_at) VALUES (?, ?, ?)")
    .bind(userId, tokenHash, expiresAt)
    .run();
  return token;
}

export async function getUserFromRequest(request, env) {
  const token = getCookie(request, SESSION_COOKIE);
  if (!token) return null;
  const tokenHash = await sha256Hex(token);
  const row = await env.DB.prepare(
    `SELECT users.id, users.first_name, users.last_name, users.username
     FROM sessions
     JOIN users ON users.id = sessions.user_id
     WHERE sessions.token_hash = ? AND sessions.expires_at > datetime('now')
     LIMIT 1`
  ).bind(tokenHash).first();
  return row || null;
}

export async function requireUser(request, env) {
  const user = await getUserFromRequest(request, env);
  if (!user) return { error: json({ ok: false, error: "Not signed in" }, 401) };
  return { user };
}
