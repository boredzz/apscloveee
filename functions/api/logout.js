import { clearSessionCookie, getCookie, json, sha256Hex } from "./_auth.js";

export async function onRequestPost({ request, env }) {
  const token = getCookie(request, "apmicro_session");
  if (token) {
    const tokenHash = await sha256Hex(token);
    await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(tokenHash).run();
  }
  return json({ ok: true }, 200, { "set-cookie": clearSessionCookie() });
}
