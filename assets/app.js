const $=(s,e=document)=>e.querySelector(s), $$=(s,e=document)=>[...e.querySelectorAll(s)];
const api=async (url,opt={})=>{const r=await fetch(url,{headers:{'content-type':'application/json'},credentials:'include',...opt});const j=await r.json().catch(()=>({ok:false,error:'Invalid server response'}));if(!r.ok&&!j.ok)return j;return j;};
let state={user:null,categories:[],notes:[],footer:[]};
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const toast=(m)=>{$('#toast').textContent=m;$('#toast').classList.add('active');setTimeout(()=>$('#toast').classList.remove('active'),2000)};
function view(h){$('#view').innerHTML=h;bindCards();}
async function load(url,key,target=key){try{const r=await api(url);state[target]=r[key]||[];}catch{state[target]=[];}}
async function init(){await Promise.all([load('/api/me','user'),load('/api/categories','categories'),load('/api/notes','notes'),load('/api/footer','columns','footer')]);renderShell();bind();route();}
function bind(){
 $('#menuBtn').onclick=()=>$('#sidebar').classList.toggle('open');
 $('#loginBtn').onclick=()=>$('#loginModal').classList.add('active');
 $('#registerBtn').onclick=()=>$('#registerModal').classList.add('active');
 $('#closeAuth').onclick=()=>$('#loginModal').classList.remove('active');
 $('#closeRegister').onclick=()=>$('#registerModal').classList.remove('active');
 $('#searchInput').addEventListener('input',searchSuggest);
 $('#loginForm').addEventListener('submit',login);
 $('#registerForm').addEventListener('submit',register);
 $('#logoutBtn').addEventListener('click',logout);
}
function renderShell(){
 $('#userLabel').textContent=state.user?.first_name?`${state.user.first_name} ${state.user.last_name||''}`.trim():state.user?.username||'Guest';
 $('#logoutBtn').style.display=state.user?'inline-block':'none';
 $('#loginBtn').style.display=state.user?'none':'inline-block';
 $('#registerBtn').style.display=state.user?'none':'inline-block';
 $('#footer').innerHTML=`<div class='footer-grid'>${(state.footer||[]).map(c=>`<div><h4>${esc(c.title)}</h4>${(c.links||[]).map(l=>`<a href='${esc(l.url)}'>${esc(l.label)}</a>`).join('')}</div>`).join('')}</div>`;
 $('#categoryTree').innerHTML=(state.categories||[]).map(c=>`<div class='cat-row' onclick="showCategory('${esc(c.slug)}')">${esc(c.title)}</div>`).join('');
}
function noteCard(n){return `<article class='card note-card' data-note='${esc(n.slug)}'><span class='pill'>${esc(n.category_title||'AP')}</span><h3>${esc(n.title)}</h3><p>${esc(n.summary||'')}</p></article>`}
function bindCards(){$$('.note-card').forEach(c=>c.onclick=()=>openNote(c.dataset.note));}
function showHome(){
 const name=state.user?.first_name||state.user?.username||'Student';
 view(`<section class='hero card'><h1>Welcome to NoteCore, ${esc(name)} 👋</h1><p>Learn faster with clean AP notes, quick summaries, and topic-based review.</p><button id='exploreBtn' class='primary'>Explore Notes</button></section><h2>Featured Notes</h2><div class='grid'>${state.notes.slice(0,6).map(noteCard).join('')}</div>`);
 $('#exploreBtn').onclick=()=>showSubjects();
}
function showSubjects(){
 const cards=state.categories.map(c=>`<button class='subject-card' onclick="showCategory('${esc(c.slug)}')"><h3>${esc(c.title)}</h3><p>${state.notes.filter(n=>n.category_slug===c.slug).length} notes</p></button>`).join('');
 view(`<h2>Subjects</h2><p class='muted'>Pick a subject to start reviewing.</p><div class='subjects-grid'>${cards}</div>`);
}
function showCategory(slug){view(`<h2>${esc(slug)}</h2><div class='grid'>${state.notes.filter(n=>n.category_slug===slug||n.slug===slug).map(noteCard).join('')}</div>`)}
async function openNote(slug){const r=await api('/api/notes/'+encodeURIComponent(slug));if(!r.ok)return toast('Note not found');const n=r.note;view(`<article class='card'><h1>${esc(n.title)}</h1><div id='noteBody'>${n.content_html||''}</div></article>`)}
async function searchSuggest(){const q=$('#searchInput').value.trim();if(q.length<2)return $('#suggestions').classList.remove('active');const r=await api('/api/search?q='+encodeURIComponent(q));$('#suggestions').innerHTML=(r.results||[]).map(x=>`<button data-slug='${esc(x.slug)}'>${esc(x.title)}</button>`).join('');$('#suggestions').classList.add('active');$$('#suggestions button').forEach(b=>b.onclick=()=>openNote(b.dataset.slug));}
function route(){const v=new URLSearchParams(location.search).get('view');if(v==='subjects')return showSubjects();return showHome();}
async function login(e){e.preventDefault();const p={username:$('#loginUsername').value.trim(),password:$('#loginPassword').value};const r=await api('/api/login',{method:'POST',body:JSON.stringify(p)});if(!r.ok)return toast(r.error||'Login failed');state.user=r.user;renderShell();$('#loginModal').classList.remove('active');toast(`Welcome back, ${r.user.first_name||r.user.username}!`);route();}
async function register(e){e.preventDefault();const p={firstName:$('#regFirstName').value.trim(),lastName:$('#regLastName').value.trim(),username:$('#regUsername').value.trim(),password:$('#regPassword').value};const r=await api('/api/register',{method:'POST',body:JSON.stringify(p)});if(!r.ok)return toast(r.error||'Register failed');state.user=r.user;renderShell();$('#registerModal').classList.remove('active');toast('Account created successfully');route();}
async function logout(){const r=await api('/api/logout',{method:'POST'});if(!r.ok)return toast(r.error||'Logout failed');state.user=null;renderShell();toast('Signed out');route();}
window.showCategory=showCategory;
init();
