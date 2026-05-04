import { json, readJson, requireAdmin } from "../_auth.js";
export async function onRequestGet({ request, env }) {
  const auth=await requireAdmin(request, env); if(auth.error) return auth.error;
  const rows=(await env.DB.prepare("SELECT id,first_name,last_name,username,role,created_at FROM users ORDER BY created_at DESC").all()).results||[];
  return json({ok:true,users:rows});
}
export async function onRequestPut({ request, env }) {
  const auth=await requireAdmin(request, env); if(auth.error) return auth.error;
  const b=await readJson(request); if(!b.id) return json({ok:false,error:'id required'},400);
  const role = b.role === 'admin' ? 'admin' : 'user';
  await env.DB.prepare("UPDATE users SET role=?, updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(role,b.id).run();
  return json({ok:true});
}
