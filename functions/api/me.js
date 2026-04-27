import { getUserFromRequest, json } from "./_auth.js";

export async function onRequestGet({ request, env }) {
  const user = await getUserFromRequest(request, env);
  return json({ ok: true, user });
}
