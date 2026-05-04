import { getUserFromRequest, json, seedIfEmpty } from "../_auth.js";
export async function onRequestGet({ request, env, params }) {
  await seedIfEmpty(env);
  const user = await getUserFromRequest(request, env);
  const slug = params.slug;
  const note = await env.DB.prepare(`SELECT n.*, c.title AS category_title, c.slug AS category_slug FROM notes n LEFT JOIN categories c ON c.id=n.category_id WHERE n.slug=? AND n.status='published' LIMIT 1`).bind(slug).first();
  if (!note) return json({ ok:false, error:'Note not found' },404);
  await env.DB.prepare("UPDATE notes SET views=views+1 WHERE id=?").bind(note.id).run();
  await env.DB.prepare("INSERT INTO note_views (note_id,user_id) VALUES (?,?)").bind(note.id, user?.id || null).run();
  const tags = (await env.DB.prepare("SELECT t.name,t.slug FROM tags t JOIN note_tags nt ON nt.tag_id=t.id WHERE nt.note_id=? ORDER BY t.name").bind(note.id).all()).results || [];
  const flashcards = (await env.DB.prepare("SELECT * FROM flashcards WHERE note_id=? ORDER BY sort_order,id").bind(note.id).all()).results || [];
  const questions = ((await env.DB.prepare("SELECT * FROM practice_questions WHERE note_id=? ORDER BY sort_order,id").bind(note.id).all()).results || []).map(q=>({ ...q, options: JSON.parse(q.options_json || '[]') }));
  const related = (await env.DB.prepare("SELECT id,title,slug,summary FROM notes WHERE status='published' AND category_id=? AND id<>? ORDER BY updated_at DESC LIMIT 4").bind(note.category_id, note.id).all()).results || [];
  return json({ ok:true, note:{ ...note, tags, flashcards, questions, related } });
}
