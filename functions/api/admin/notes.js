import { json, readJson, requireAdmin, sanitizeHtml, slugify } from "../_auth.js";
async function syncTags(env, noteId, tags=[]) {
  await env.DB.prepare("DELETE FROM note_tags WHERE note_id=?").bind(noteId).run();
  for (const raw of tags) {
    const name=String(raw||'').trim(); if(!name) continue; const slug=slugify(name);
    await env.DB.prepare("INSERT OR IGNORE INTO tags (name,slug) VALUES (?,?)").bind(name,slug).run();
    const tag = await env.DB.prepare("SELECT id FROM tags WHERE slug=?").bind(slug).first();
    await env.DB.prepare("INSERT OR IGNORE INTO note_tags (note_id,tag_id) VALUES (?,?)").bind(noteId,tag.id).run();
  }
}
async function syncExtras(env, noteId, flashcards=[], questions=[]) {
  await env.DB.prepare("DELETE FROM flashcards WHERE note_id=?").bind(noteId).run();
  await env.DB.prepare("DELETE FROM practice_questions WHERE note_id=?").bind(noteId).run();
  for (let i=0;i<flashcards.length;i++) if(flashcards[i].front && flashcards[i].back) await env.DB.prepare("INSERT INTO flashcards (note_id,front,back,sort_order) VALUES (?,?,?,?)").bind(noteId,flashcards[i].front,flashcards[i].back,i).run();
  for (let i=0;i<questions.length;i++) if(questions[i].question) await env.DB.prepare("INSERT INTO practice_questions (note_id,question,options_json,correct_answer,explanation,sort_order) VALUES (?,?,?,?,?,?)").bind(noteId,questions[i].question,JSON.stringify(questions[i].options||[]),questions[i].correct_answer||'',questions[i].explanation||'',i).run();
}
export async function onRequestGet({ request, env }) {
  const auth=await requireAdmin(request, env); if(auth.error) return auth.error;
  const id=Number(new URL(request.url).searchParams.get('id'));
  if(id){
    const note=await env.DB.prepare("SELECT * FROM notes WHERE id=?").bind(id).first();
    if(!note) return json({ok:false,error:'Not found'},404);
    const tags=(await env.DB.prepare("SELECT t.name FROM tags t JOIN note_tags nt ON nt.tag_id=t.id WHERE nt.note_id=?").bind(id).all()).results.map(x=>x.name);
    const flashcards=(await env.DB.prepare("SELECT front,back FROM flashcards WHERE note_id=? ORDER BY sort_order,id").bind(id).all()).results||[];
    const questions=((await env.DB.prepare("SELECT question,options_json,correct_answer,explanation FROM practice_questions WHERE note_id=? ORDER BY sort_order,id").bind(id).all()).results||[]).map(q=>({...q, options:JSON.parse(q.options_json||'[]')}));
    return json({ok:true,note:{...note,tags,flashcards,questions}});
  }
  const rows=(await env.DB.prepare("SELECT n.*,c.title AS category_title FROM notes n LEFT JOIN categories c ON c.id=n.category_id ORDER BY n.updated_at DESC").all()).results||[];
  return json({ok:true,notes:rows});
}
export async function onRequestPost({ request, env }) {
  const auth=await requireAdmin(request, env); if(auth.error) return auth.error;
  const b=await readJson(request); const title=String(b.title||'').trim(); if(!title) return json({ok:false,error:'Title required'},400);
  const slug=slugify(b.slug||title); const status=b.status||'draft';
  await env.DB.prepare("INSERT INTO notes (title,slug,summary,content_html,category_id,status,published_at) VALUES (?,?,?,?,?,?,CASE WHEN ?='published' THEN CURRENT_TIMESTAMP ELSE NULL END)").bind(title,slug,b.summary||'',sanitizeHtml(b.content_html||''),b.category_id||null,status,status).run();
  const note=await env.DB.prepare("SELECT id FROM notes WHERE slug=?").bind(slug).first();
  await syncTags(env,note.id,b.tags||[]); await syncExtras(env,note.id,b.flashcards||[],b.questions||[]);
  return json({ok:true,id:note.id});
}
export async function onRequestPut({ request, env }) {
  const auth=await requireAdmin(request, env); if(auth.error) return auth.error;
  const b=await readJson(request); if(!b.id) return json({ok:false,error:'id required'},400);
  const old=await env.DB.prepare("SELECT * FROM notes WHERE id=?").bind(b.id).first(); if(!old) return json({ok:false,error:'Not found'},404);
  await env.DB.prepare("INSERT INTO note_versions (note_id,title,summary,content_html) VALUES (?,?,?,?)").bind(old.id,old.title,old.summary,old.content_html).run();
  const title=String(b.title||old.title).trim(); const status=b.status||old.status;
  await env.DB.prepare("UPDATE notes SET title=?,slug=?,summary=?,content_html=?,category_id=?,status=?,updated_at=CURRENT_TIMESTAMP,published_at=CASE WHEN ?='published' AND published_at IS NULL THEN CURRENT_TIMESTAMP ELSE published_at END WHERE id=?").bind(title,slugify(b.slug||title),b.summary||'',sanitizeHtml(b.content_html||''),b.category_id||null,status,status,b.id).run();
  await syncTags(env,b.id,b.tags||[]); await syncExtras(env,b.id,b.flashcards||[],b.questions||[]); return json({ok:true});
}
export async function onRequestDelete({ request, env }) {
  const auth=await requireAdmin(request, env); if(auth.error) return auth.error;
  const id=Number(new URL(request.url).searchParams.get('id')); if(!id) return json({ok:false,error:'id required'},400);
  await env.DB.prepare("DELETE FROM notes WHERE id=?").bind(id).run(); return json({ok:true});
}
