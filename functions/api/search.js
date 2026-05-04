import { getUserFromRequest, json, seedIfEmpty } from "./_auth.js";
export async function onRequestGet({ request, env }) {
  await seedIfEmpty(env);
  const user = await getUserFromRequest(request, env);
  const url = new URL(request.url); const q = String(url.searchParams.get('q') || '').trim();
  if (!q) return json({ ok:true, results: [] });
  await env.DB.prepare("INSERT INTO search_logs (query,user_id) VALUES (?,?)").bind(q, user?.id || null).run();
  const like = `%${q}%`;
  const rows = (await env.DB.prepare(`SELECT DISTINCT n.id,n.title,n.slug,n.summary,c.title AS category_title
    FROM notes n LEFT JOIN categories c ON c.id=n.category_id LEFT JOIN note_tags nt ON nt.note_id=n.id LEFT JOIN tags t ON t.id=nt.tag_id
    WHERE n.status='published' AND (n.title LIKE ? OR n.summary LIKE ? OR n.content_html LIKE ? OR c.title LIKE ? OR t.name LIKE ?)
    ORDER BY n.updated_at DESC LIMIT 20`).bind(like,like,like,like,like).all()).results || [];
  return json({ ok:true, results: rows });
}
