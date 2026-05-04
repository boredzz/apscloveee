import { json, readJson, requireAdmin } from "../_auth.js";
export async function onRequestGet({ request, env }) {
  const auth=await requireAdmin(request, env); if(auth.error) return auth.error;
  const noteId=Number(new URL(request.url).searchParams.get('noteId')); if(!noteId) return json({ok:false,error:'noteId required'},400);
  const rows=(await env.DB.prepare("SELECT * FROM note_versions WHERE note_id=? ORDER BY created_at DESC LIMIT 20").bind(noteId).all()).results||[];
  return json({ok:true,versions:rows});
}
export async function onRequestPost({ request, env }) {
  const auth=await requireAdmin(request, env); if(auth.error) return auth.error;
  const b=await readJson(request); if(!b.versionId) return json({ok:false,error:'versionId required'},400);
  const v=await env.DB.prepare("SELECT * FROM note_versions WHERE id=?").bind(b.versionId).first(); if(!v) return json({ok:false,error:'Version not found'},404);
  await env.DB.prepare("UPDATE notes SET title=?,summary=?,content_html=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(v.title,v.summary,v.content_html,v.note_id).run();
  return json({ok:true});
}
