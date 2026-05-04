import { json, readJson, requireUser } from "./_auth.js";
export async function onRequestPost({ request, env }) {
  const auth=await requireUser(request, env); if(auth.error) return auth.error;
  const b=await readJson(request); if(!b.noteId) return json({ok:false,error:'noteId required'},400);
  await env.DB.prepare("INSERT INTO ratings (note_id,user_id,helpful) VALUES (?,?,?) ON CONFLICT(note_id,user_id) DO UPDATE SET helpful=excluded.helpful, created_at=CURRENT_TIMESTAMP").bind(b.noteId,auth.user.id,b.helpful?1:0).run();
  return json({ok:true});
}
