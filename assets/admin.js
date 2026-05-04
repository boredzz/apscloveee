const root=document.getElementById('admin-root');
const api=(u,o={})=>fetch(u,{credentials:'include',headers:{'content-type':'application/json'},...o}).then(r=>r.json());
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
async function boot(){const me=await api('/api/me').catch(()=>({}));if(me.user?.role!=='admin'){root.innerHTML='<div class="card"><h2>Admin access required</h2><p>Please login with an admin account on the main site.</p></div>';return;}render();}
async function render(){const [stats,cats,users,footer,notes]=await Promise.all([api('/api/admin/stats'),api('/api/admin/categories'),api('/api/admin/users'),api('/api/admin/footer'),api('/api/admin/notes')]);
root.innerHTML=`<div class='grid'>${['notes','published','drafts','categories'].map(k=>`<div class='card'><h3>${k}</h3><p>${stats.stats?.[k]??0}</p></div>`).join('')}</div>
<div class='card'><h2>Categories</h2><div>${(cats.categories||[]).map(c=>`<div class='admin-row'><input data-cat-title='${c.id}' value='${esc(c.title)}'><button data-cat-save='${c.id}'>Save</button></div>`).join('')}</div></div>
<div class='card'><h2>Users</h2>${(users.users||[]).map(u=>`<div class='admin-row'><span>${esc(u.username)} (${esc(u.first_name||'')} ${esc(u.last_name||'')})</span><select data-user-role='${u.id}'><option ${u.role==='user'?'selected':''}>user</option><option ${u.role==='admin'?'selected':''}>admin</option></select><button data-user-save='${u.id}'>Update</button></div>`).join('')}</div>
<div class='card'><h2>Notes (quick status editor)</h2>${(notes.notes||[]).slice(0,30).map(n=>`<div class='admin-row'><span>${esc(n.title)}</span><select data-note-status='${n.id}'><option ${n.status==='draft'?'selected':''}>draft</option><option ${n.status==='published'?'selected':''}>published</option></select><button data-note-save='${n.id}'>Save</button></div>`).join('')}</div>
<div class='card'><h2>Footer Columns</h2>${(footer.columns||[]).map((c,i)=>`<div class='admin-row'><input data-footer-title='${i}' value='${esc(c.title)}'></div>`).join('')}<button id='saveFooter'>Save Footer</button></div>`;

for(const b of document.querySelectorAll('[data-cat-save]')) b.onclick=async()=>{const id=b.dataset.catSave;const title=document.querySelector(`[data-cat-title='${id}']`).value;await api('/api/admin/categories',{method:'PUT',body:JSON.stringify({id,title,slug:title})});render();};
for(const b of document.querySelectorAll('[data-user-save]')) b.onclick=async()=>{const id=b.dataset.userSave;const role=document.querySelector(`[data-user-role='${id}']`).value;await api('/api/admin/users',{method:'PUT',body:JSON.stringify({id,role})});render();};
for(const b of document.querySelectorAll('[data-note-save]')) b.onclick=async()=>{const id=b.dataset.noteSave;const status=document.querySelector(`[data-note-status='${id}']`).value;const old=(notes.notes||[]).find(x=>String(x.id)===String(id));await api('/api/admin/notes',{method:'PUT',body:JSON.stringify({id,title:old.title,slug:old.slug,summary:old.summary,content_html:old.content_html,category_id:old.category_id,status,tags:[]})});render();};
$('#saveFooter')?.addEventListener('click',async()=>{const cols=(footer.columns||[]).map((c,i)=>({title:document.querySelector(`[data-footer-title='${i}']`).value,links:c.links||[]}));await api('/api/admin/footer',{method:'POST',body:JSON.stringify({columns:cols})});render();});
}
const $=(s,e=document)=>e.querySelector(s);
boot();
