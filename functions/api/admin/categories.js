import { json, readJson, requireAdmin, slugify } from "../_auth.js";
export async function onRequestGet({ request, env }) {
  const auth = await requireAdmin(request, env); if (auth.error) return auth.error;
  const rows = (await env.DB.prepare("SELECT * FROM categories ORDER BY parent_id IS NOT NULL, sort_order, title").all()).results || [];
  return json({ ok:true, categories: rows });
}
export async function onRequestPost({ request, env }) {
  const auth = await requireAdmin(request, env); if (auth.error) return auth.error;
  const b = await readJson(request); const title=String(b.title||'').trim(); if(!title) return json({ok:false,error:'Title required'},400);
  const slug=slugify(b.slug||title); await env.DB.prepare("INSERT INTO categories (parent_id,title,slug,description,sort_order,status) VALUES (?,?,?,?,?,?)").bind(b.parent_id||null,title,slug,b.description||'',Number(b.sort_order)||0,b.status||'published').run();
  return json({ ok:true });
}
export async function onRequestPut({ request, env }) {
  const auth = await requireAdmin(request, env); if (auth.error) return auth.error;
  const b=await readJson(request); if(!b.id) return json({ok:false,error:'id required'},400);
  await env.DB.prepare("UPDATE categories SET parent_id=?, title=?, slug=?, description=?, sort_order=?, status=? WHERE id=?").bind(b.parent_id||null,String(b.title||'Untitled').trim(),slugify(b.slug||b.title),b.description||'',Number(b.sort_order)||0,b.status||'published',b.id).run();
  return json({ok:true});
}
export async function onRequestDelete({ request, env }) {
  const auth = await requireAdmin(request, env); if (auth.error) return auth.error;
  const id=Number(new URL(request.url).searchParams.get('id')); if(!id) return json({ok:false,error:'id required'},400);
  await env.DB.prepare("DELETE FROM categories WHERE id=?").bind(id).run(); return json({ok:true});
}
