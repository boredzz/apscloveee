import { createSession, ensureSchema, hashPassword, json, readJson, sessionCookie, validatePassword, validateUsername } from "./_auth.js";

export async function onRequestPost({ request, env }) {
  try {
    await ensureSchema(env);
    const body = await readJson(request);
    const username = String(body.username || "").trim();
    const password = String(body.password || "");
    if (!validateUsername(username) || !validatePassword(password)) return json({ ok:false, error:"Invalid username or password." },401);

    // Bind the correct variable and use .first() to get a single row
    const user = await env.DB
      .prepare("SELECT id, first_name, last_name, username, password_hash, salt, COALESCE(role,'user') AS role FROM users WHERE username = ? COLLATE NOCASE LIMIT 1")
      .bind(username)
      .first();

    if (!user) return json({ ok:false, error:"Invalid username or password." },401);
    const passwordHash = await hashPassword(password, user.salt);
    if (passwordHash !== user.password_hash) return json({ ok:false, error:"Invalid username or password." },401);

    const token = await createSession(env, user.id);
    return json(
      { ok:true, user:{ id:user.id, first_name:user.first_name, last_name:user.last_name, username:user.username, role:user.role } },
      200,
      { "set-cookie": sessionCookie(token) }
    );
  } catch(error) {
    return json({ ok:false, error:`Login failed: ${error.message}. Check D1 schema.` },500);
  }
}
