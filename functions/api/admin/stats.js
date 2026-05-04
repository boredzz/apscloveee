import { json, requireAdmin } from "../_auth.js";
export async function onRequestGet({ request, env }) {
  const auth = await requireAdmin(request, env); if (auth.error) return auth.error;
  const one = async (sql) => (await env.DB.prepare(sql).first())?.c || 0;
  const topNotes = (await env.DB.prepare("SELECT title,slug,views FROM notes ORDER BY views DESC LIMIT 5").all()).results || [];
  const searches = (await env.DB.prepare("SELECT query,COUNT(*) AS count FROM search_logs GROUP BY query ORDER BY count DESC LIMIT 8").all()).results || [];
  return json({ ok:true, stats:{
    notes: await one("SELECT COUNT(*) c FROM notes"),
    published: await one("SELECT COUNT(*) c FROM notes WHERE status='published'"),
    drafts: await one("SELECT COUNT(*) c FROM notes WHERE status='draft'"),
    categories: await one("SELECT COUNT(*) c FROM categories"),
    users: await one("SELECT COUNT(*) c FROM users"),
    topNotes, searches
  }});
}
