import { json } from "./_auth.js";

export async function onRequestGet({ env }) {
  try {
    const rows = await env.DB.prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('users', 'sessions', 'progress') ORDER BY name"
    ).all();
    const tables = (rows.results || []).map((row) => row.name);
    return json({
      ok: tables.includes("users") && tables.includes("sessions") && tables.includes("progress"),
      tables,
      message: tables.length === 3 ? "D1 is ready." : "D1 is connected, but schema.sql has not been fully run."
    });
  } catch (error) {
    return json({ ok: false, error: `D1 check failed: ${error.message}` }, 500);
  }
}
