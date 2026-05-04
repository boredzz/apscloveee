const root=document.getElementById('admin-root');
const $=(s,e=document)=>e.querySelector(s);
const api=async (u,o={})=>{const r=await fetch(u,{credentials:'include',headers:{'content-type':'application/json'},...o});return r.json().catch(()=>({ok:false,error:'Invalid response'}));};
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

async function boot(){
  root.innerHTML="<div class='card'><p class='muted'>Loading admin dashboard…</p></div>";
  const me=await api('/api/me').catch(()=>({}));
  if(me.user?.role!=='admin'){root.innerHTML='<div class="card"><h2>Admin access required</h2><p>Please login with an admin account on the main site.</p></div>';return;}
  await renderFast();
  renderSlow();
}

async function renderFast(){
  const [stats,cats,users,footer]=await Promise.all([api('/api/admin/stats'),api('/api/admin/categories'),api('/api/admin/users'),api('/api/admin/footer')]);
  root.innerHTML=`<div class='grid'>${['notes','published','drafts','categories'].map(k=>`<div class='card'><h3>${k}</h3><p>${stats.stats?.[k]??0}</p></div>`).join('')}</div>
  <div class='card'><h2>Categories</h2>${(cats.categories||[]).map(c=>`<div class='admin-row'><input data-cat-title='${c.id}' value='${esc(c.title)}'><button data-cat-save='${c.id}'>Save</button></div>`).join('')}</div>
  <div class='card'><h2>Users</h2>${(users.users||[]).map(u=>`<div class='admin-row'><span>${esc(u.username)} (${esc(u.first_name||'')} ${esc(u.last_name||'')})</span><select data-user-role='${u.id}'><option ${u.role==='user'?'selected':''}>user</option><option ${u.role==='admin'?'selected':''}>admin</option></select><button data-user-save='${u.id}'>Update</button></div>`).join('')}</div>
  <div class='card'><h2>Footer Columns</h2>${(footer.columns||[]).map((c,i)=>`<div class='admin-row'><input data-footer-title='${i}' value='${esc(c.title)}'></div>`).join('')}<button id='saveFooter'>Save Footer</button></div>
  <div class='card'><h2>Notes (deferred)</h2><p class='muted'>Load notes editor on demand for faster admin startup.</p><button id='loadNotesBtn'>Load Notes Editor</button><div id='notesEditor'></div></div>`;

  for(const b of document.querySelectorAll('[data-cat-save]')) b.onclick=async()=>{const id=b.dataset.catSave;const title=document.querySelector(`[data-cat-title='${id}']`).value;await api('/api/admin/categories',{method:'PUT',body:JSON.stringify({id,title,slug:title})});};
  for(const b of document.querySelectorAll('[data-user-save]')) b.onclick=async()=>{const id=b.dataset.userSave;const role=document.querySelector(`[data-user-role='${id}']`).value;await api('/api/admin/users',{method:'PUT',body:JSON.stringify({id,role})});};
  $('#saveFooter')?.addEventListener('click',async()=>{const cols=(footer.columns||[]).map((c,i)=>({title:document.querySelector(`[data-footer-title='${i}']`).value,links:c.links||[]}));await api('/api/admin/footer',{method:'POST',body:JSON.stringify({columns:cols})});});
  $('#loadNotesBtn')?.addEventListener('click',loadNotesEditor);
}

async function loadNotesEditor(){
  const holder=$('#notesEditor');
  holder.innerHTML="<p class='muted'>Loading notes…</p>";
  const notes=await api('/api/admin/notes');
  holder.innerHTML=(notes.notes||[]).slice(0,30).map(n=>`<div class='admin-row'><span>${esc(n.title)}</span><select data-note-status='${n.id}'><option ${n.status==='draft'?'selected':''}>draft</option><option ${n.status==='published'?'selected':''}>published</option></select><button data-note-save='${n.id}'>Save</button></div>`).join('')||"<p class='muted'>No notes found.</p>";
  for(const b of holder.querySelectorAll('[data-note-save]')) b.onclick=async()=>{const id=b.dataset.noteSave;const status=holder.querySelector(`[data-note-status='${id}']`).value;const old=(notes.notes||[]).find(x=>String(x.id)===String(id));await api('/api/admin/notes',{method:'PUT',body:JSON.stringify({id,title:old.title,slug:old.slug,summary:old.summary,content_html:old.content_html,category_id:old.category_id,status,tags:[]})});};
}

async function renderSlow(){/* reserved for future deferred modules */}
boot();
