import { createSession, hashPassword, json, randomHex, readJson, sessionCookie, validatePassword, validateUsername } from "./_auth.js";

export async function onRequestPost({ request, env }) {
  const body = await readJson(request);
  const firstName = String(body.firstName || "").trim();
  const lastName = String(body.lastName || "").trim();
  const username = String(body.username || "").trim();
  const password = String(body.password || "");
  const confirmPassword = String(body.confirmPassword || "");

  if (!firstName || !lastName) return json({ ok: false, error: "Enter first and last name." }, 400);
  if (!validateUsername(username)) return json({ ok: false, error: "Username must be 3-24 letters, numbers, or underscores." }, 400);
  if (!validatePassword(password)) return json({ ok: false, error: "Password must be at least 8 characters." }, 400);
  if (password !== confirmPassword) return json({ ok: false, error: "Passwords do not match." }, 400);

  const exists = await env.DB.prepare("SELECT id FROM users WHERE username = ? COLLATE NOCASE").bind(username).first();
  if (exists) return json({ ok: false, error: "Username is already taken." }, 409);

  const salt = randomHex(16);
  const passwordHash = await hashPassword(password, salt);
  await env.DB.prepare(
    "INSERT INTO users (first_name, last_name, username, password_hash, salt) VALUES (?, ?, ?, ?, ?)"
  ).bind(firstName, lastName, username, passwordHash, salt).run();

  const created = await env.DB.prepare("SELECT id FROM users WHERE username = ? COLLATE NOCASE LIMIT 1")
    .bind(username)
    .first();
  const userId = created.id;
  const token = await createSession(env, userId);
  return json({
    ok: true,
    user: { id: userId, first_name: firstName, last_name: lastName, username }
  }, 200, { "set-cookie": sessionCookie(token) });
}
