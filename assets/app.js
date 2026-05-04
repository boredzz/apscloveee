const $=(s,e=document)=>e.querySelector(s), $$=(s,e=document)=>[...e.querySelectorAll(s)];
const api=(url,opt={})=>fetch(url,{headers:{'content-type':'application/json'},...opt}).then(r=>r.json());
let state={user:null,categories:[],notes:[],footer:[],bookmarks:JSON.parse(localStorage.ap_bookmarks||'[]')};
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const toast=(m)=>{$('#toast').textContent=m;$('#toast').classList.add('active');setTimeout(()=>$('#toast').classList.remove('active'),1600)};
function view(h){$('#view').innerHTML=h; bindCards();}
async function init(){await Promise.all([load('/api/me','user'),load('/api/categories','categories'),load('/api/notes','notes'),load('/api/footer','columns','footer')]);renderShell();bind();showHome();if(location.pathname.startsWith('/admin'))showAdmin();}
async function load(url,key,target=key){try{const r=await api(url);state[target]=r[key]||[];}catch{}}
function bind(){$('#menuBtn').onclick=()=>$('#sidebar').classList.toggle('open');$('#loginBtn').onclick=()=>$('#loginModal').classList.toggle('active');$('#searchInput').addEventListener('input',searchSuggest);document.addEventListener('keydown',e=>{if(e.key==='/'&&document.activeElement.tagName!=='INPUT'){e.preventDefault();$('#searchInput').focus();}})}
function renderShell(){$('#userLabel').textContent=state.user?.username||'Guest';$('#footer').innerHTML=`<div class='footer-grid'>${(state.footer||[]).map(c=>`<div><h4>${esc(c.title)}</h4>${(c.links||[]).map(l=>`<a href='${esc(l.url)}'>${esc(l.label)}</a>`).join('')}</div>`).join('')}</div>`;$('#categoryTree').innerHTML=(state.categories||[]).map(c=>`<div class='cat-row' onclick="showCategory('${esc(c.slug)}')">${esc(c.title)}</div>`).join('');}
function noteCard(n){return `<article class='card note-card' data-note='${esc(n.slug)}'><span class='pill'>${esc(n.category_title||'AP')}</span><h3>${esc(n.title)}</h3><p>${esc(n.summary||'')}</p><div>${(n.tags||[]).map(t=>`<button type='button' class='pill tag-pill' data-tag='${esc(t)}'>#${esc(t)}</button>`).join('')}</div></article>`}
function bindCards(){$$('.note-card').forEach(c=>c.onclick=(e)=>{if(e.target.closest('.tag-pill'))return;openNote(c.dataset.note)});$$('.tag-pill').forEach(t=>t.onclick=(e)=>{e.stopPropagation();showTag(t.dataset.tag);});}
function showHome(){view(`<div class='grid'>${state.notes.map(noteCard).join('')}</div>`)}
function showCategory(slug){view(`<h2>${esc(slug)}</h2><div class='grid'>${state.notes.filter(n=>n.category_slug===slug||n.slug===slug).map(noteCard).join('')}</div>`)}
function showTag(tag){view(`<h2>Tag #${esc(tag)}</h2><div class='grid'>${state.notes.filter(n=>(n.tags||[]).includes(tag)).map(noteCard).join('')}</div>`)}
async function openNote(slug){const r=await api('/api/notes/'+encodeURIComponent(slug));if(!r.ok)return toast('Note not found');const n=r.note;view(`<article class='card'><h1>${esc(n.title)}</h1><div id='noteBody'>${n.content_html||''}</div></article>`)}
async function searchSuggest(){const q=$('#searchInput').value.trim();if(q.length<2)return $('#suggestions').classList.remove('active');const r=await api('/api/search?q='+encodeURIComponent(q));$('#suggestions').innerHTML=(r.results||[]).map(x=>`<button data-slug='${esc(x.slug)}'>${esc(x.title)}</button>`).join('');$('#suggestions').classList.add('active');$$('#suggestions button').forEach(b=>b.onclick=()=>openNote(b.dataset.slug));}
function showAdmin(){view(`<h2>Admin Dashboard</h2><p>Use /admin/ for management tools.</p>`)}
init();
