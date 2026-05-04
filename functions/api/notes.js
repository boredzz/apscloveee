import { json, seedIfEmpty } from "./_auth.js";
function splitTags(row){ return row.tags ? row.tags.split('|||').filter(Boolean) : []; }
export async function onRequestGet({ request, env }) {
  await seedIfEmpty(env);
  const url = new URL(request.url);
  const category = url.searchParams.get('category');
  const tag = url.searchParams.get('tag');
  const status = url.searchParams.get('status') || 'published';
  let sql = `SELECT n.id,n.title,n.slug,n.summary,n.category_id,n.status,n.views,n.updated_at,c.title AS category_title, GROUP_CONCAT(t.name,'|||') AS tags
             FROM notes n LEFT JOIN categories c ON c.id=n.category_id LEFT JOIN note_tags nt ON nt.note_id=n.id LEFT JOIN tags t ON t.id=nt.tag_id`;
  const where = []; const bind = [];
  if (status !== 'all') { where.push('n.status=?'); bind.push(status); }
  if (category) { where.push('(c.slug=? OR n.category_id=?)'); bind.push(category, Number(category)||0); }
  if (where.length) sql += ' WHERE ' + where.join(' AND ');
  sql += ' GROUP BY n.id ORDER BY n.updated_at DESC';
  let rows = (await env.DB.prepare(sql).bind(...bind).all()).results || [];
  rows = rows.map(r => ({ ...r, tags: splitTags(r) }));
  if (tag) rows = rows.filter(r => r.tags.map(x=>x.toLowerCase()).includes(tag.toLowerCase()));
  return json({ ok:true, notes: rows });
}
