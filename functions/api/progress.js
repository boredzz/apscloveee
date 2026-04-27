import { json, readJson, requireUser } from "./_auth.js";

export async function onRequestGet({ request, env }) {
  const auth = await requireUser(request, env);
  if (auth.error) return auth.error;
  const row = await env.DB.prepare("SELECT progress_json, updated_at FROM progress WHERE user_id = ?")
    .bind(auth.user.id)
    .first();
  return json({ ok: true, progress: row ? JSON.parse(row.progress_json) : null, updated_at: row?.updated_at || null });
}

export async function onRequestPost({ request, env }) {
  const auth = await requireUser(request, env);
  if (auth.error) return auth.error;
  const body = await readJson(request);
  const progress = body.progress || {};
  const progressJson = JSON.stringify(progress);
  if (progressJson.length > 750000) return json({ ok: false, error: "Progress file is too large." }, 413);
  await env.DB.prepare(
    `INSERT INTO progress (user_id, progress_json, updated_at)
     VALUES (?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(user_id) DO UPDATE SET progress_json = excluded.progress_json, updated_at = CURRENT_TIMESTAMP`
  ).bind(auth.user.id, progressJson).run();
  return json({ ok: true });
}
