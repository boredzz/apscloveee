import { ensureSchema, json } from "./_auth.js";
export async function onRequestGet({ env }) {
  try {
    await ensureSchema(env);
    const rows = await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
    const tables = (rows.results || []).map(r=>r.name);
    return json({ ok:true, tables, message:"D1 is ready for AP notes platform." });
  } catch (error) { return json({ ok:false, error:`D1 check failed: ${error.message}` },500); }
}
