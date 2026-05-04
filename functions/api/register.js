import { createSession, ensureSchema, hashPassword, json, randomHex, readJson, sessionCookie, validatePassword, validateUsername } from "./_auth.js";
export async function onRequestPost({ request, env }) {
  try {
    await ensureSchema(env);
    const body = await readJson(request);
    const firstName = String(body.firstName || "").trim();
    const lastName = String(body.lastName || "").trim();
    const username = String(body.username || "").trim();
    const password = String(body.password || "");
    const confirmPassword = String(body.confirmPassword || "");
    if (!firstName || !lastName) return json({ ok:false, error:"Enter first and last name." },400);
    if (!validateUsername(username)) return json({ ok:false, error:"Username must be 3-24 letters, numbers, or underscores." },400);
    if (!validatePassword(password)) return json({ ok:false, error:"Password must be at least 8 characters." },400);
    if (password !== confirmPassword) return json({ ok:false, error:"Passwords do not match." },400);
    const exists = await env.DB.prepare("SELECT id FROM users WHERE username = ? COLLATE NOCASE").bind(username).first();
    if (exists) return json({ ok:false, error:"Username is already taken." },409);
    const salt = randomHex(16); const passwordHash = await hashPassword(password, salt);
    const users = await env.DB.prepare("SELECT COUNT(*) AS c FROM users").first();
    const role = users.c === 0 ? "admin" : "user";
    await env.DB.prepare("INSERT INTO users (first_name,last_name,username,password_hash,salt,role) VALUES (?,?,?,?,?,?)").bind(firstName,lastName,username,passwordHash,salt,role).run();
    const created = await env.DB.prepare("SELECT id, role FROM users WHERE username = ? COLLATE NOCASE LIMIT 1").bind(username).first();
    const token = await createSession(env, created.id);
    return json({ ok:true, user:{ id:created.id, first_name:firstName, last_name:lastName, username, role:created.role } },200,{"set-cookie":sessionCookie(token)});
  } catch (error) { return json({ ok:false, error:`Register failed: ${error.message}. Check D1 schema.` },500); }
}
