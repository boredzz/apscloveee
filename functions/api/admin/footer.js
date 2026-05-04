import { json, readJson, requireAdmin } from "../_auth.js";
export async function onRequestGet({ request, env }) {
  const auth=await requireAdmin(request, env); if(auth.error) return auth.error;
  const cols=(await env.DB.prepare("SELECT * FROM footer_columns ORDER BY sort_order,id").all()).results||[];
  const links=(await env.DB.prepare("SELECT * FROM footer_links ORDER BY sort_order,id").all()).results||[];
  return json({ok:true,columns:cols.map(c=>({...c,links:links.filter(l=>l.column_id==c.id)}))});
}
export async function onRequestPost({ request, env }) {
  const auth=await requireAdmin(request, env); if(auth.error) return auth.error;
  const b=await readJson(request);
  await env.DB.prepare("DELETE FROM footer_links").run(); await env.DB.prepare("DELETE FROM footer_columns").run();
  for(let i=0;i<(b.columns||[]).length;i++){
    const col=b.columns[i]; if(!col.title) continue;
    await env.DB.prepare("INSERT INTO footer_columns (title,sort_order) VALUES (?,?)").bind(col.title,i).run();
    const saved=await env.DB.prepare("SELECT id FROM footer_columns WHERE title=? ORDER BY id DESC LIMIT 1").bind(col.title).first();
    for(let j=0;j<(col.links||[]).length;j++){ const l=col.links[j]; if(l.label) await env.DB.prepare("INSERT INTO footer_links (column_id,label,url,sort_order) VALUES (?,?,?,?)").bind(saved.id,l.label,l.url||'#',j).run(); }
  }
  return json({ok:true});
}
