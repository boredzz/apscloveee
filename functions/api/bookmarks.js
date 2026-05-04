import { json, readJson, requireUser } from "./_auth.js";

export async function onRequestGet({ request, env }) {
  const auth = await requireUser(request, env); if (auth.error) return auth.error;

  // Ensure .all() is used and extract results array
  const res = await env.DB.prepare(
    "SELECT n.id, n.title, n.slug, n.summary, b.created_at FROM bookmarks b JOIN notes n ON n.id = b.note_id WHERE b.user_id = ? ORDER BY b.created_at DESC"
  ).bind(auth.user.id).all();
  const rows = res.results || [];

  return json({ ok:true, bookmarks: rows });
}

export async function onRequestPost({ request, env }) {
  const auth = await requireUser(request, env); if (auth.error) return auth.error;
  const body = await readJson(request); const noteId = Number(body.noteId);
  if (!noteId) return json({ ok:false, error:'noteId required' },400);
  await env.DB.prepare("INSERT OR IGNORE INTO bookmarks (user_id,note_id) VALUES (?,?)").bind(auth.user.id,noteId).run();
  return json({ ok:true });
}

export async function onRequestDelete({ request, env }) {
  const auth = await requireUser(request, env); if (auth.error) return auth.error;
  const url = new URL(request.url); const noteId = Number(url.searchParams.get('noteId'));
  await env.DB.prepare("DELETE FROM bookmarks WHERE user_id=? AND note_id=?").bind(auth.user.id,noteId).run();
  return json({ ok:true });
}
