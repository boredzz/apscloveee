import { json, seedIfEmpty } from "./_auth.js";
export async function onRequestGet({ env }) {
  await seedIfEmpty(env);
  const { results } = await env.DB.prepare("SELECT * FROM categories WHERE status='published' ORDER BY parent_id IS NOT NULL, sort_order, title").all();
  return json({ ok:true, categories: results || [] });
}
