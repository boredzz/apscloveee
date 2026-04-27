import { createSession, hashPassword, json, readJson, sessionCookie, validatePassword, validateUsername } from "./_auth.js";

export async function onRequestPost({ request, env }) {
  try {
    const body = await readJson(request);
    const username = String(body.username || "").trim();
    const password = String(body.password || "");

    if (!validateUsername(username) || !validatePassword(password)) {
      return json({ ok: false, error: "Invalid username or password." }, 401);
    }

    const user = await env.DB.prepare(
      "SELECT id, first_name, last_name, username, password_hash, salt FROM users WHERE username = ? COLLATE NOCASE LIMIT 1"
    ).bind(username).first();
    if (!user) return json({ ok: false, error: "Invalid username or password." }, 401);

    const passwordHash = await hashPassword(password, user.salt);
    if (passwordHash !== user.password_hash) return json({ ok: false, error: "Invalid username or password." }, 401);

    const token = await createSession(env, user.id);
    return json({
      ok: true,
      user: { id: user.id, first_name: user.first_name, last_name: user.last_name, username: user.username }
    }, 200, { "set-cookie": sessionCookie(token) });
  } catch (error) {
    return json({ ok: false, error: `Login failed: ${error.message}. Check that schema.sql was run on the apsite D1 database.` }, 500);
  }
}
