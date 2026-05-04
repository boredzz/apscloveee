import { json, seedIfEmpty } from "./_auth.js";

export async function onRequestGet({ env }) {
  await seedIfEmpty(env);
  const cols = (await env.DB.prepare("SELECT * FROM footer_columns ORDER BY sort_order, id").all()).results || [];
  const links = (await env.DB.prepare("SELECT * FROM footer_links ORDER BY sort_order, id").all()).results || [];

  // Use loose equality or coerce types so matching works even if types differ
  return json({ ok:true, columns: cols.map(c => ({ ...c, links: links.filter(l => l.column_id == c.id) })) });
}
