const encoder = new TextEncoder();
const SESSION_COOKIE = "apmicro_session";
const SESSION_DAYS = 30;

export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...extraHeaders }
  });
}

export async function readJson(request) { try { return await request.json(); } catch { return {}; } }
export function validateUsername(username) { return /^[a-zA-Z0-9_]{3,24}$/.test(username || ""); }
export function validatePassword(password) { return typeof password === "string" && password.length >= 8 && password.length <= 128; }
export function randomHex(bytes = 32) { const data = new Uint8Array(bytes); crypto.getRandomValues(data); return [...data].map(b=>b.toString(16).padStart(2,"0")).join(""); }

export async function sha256Hex(value) {
  const hash = await crypto.subtle.digest("SHA-256", encoder.encode(String(value || "")));
  return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,"0")).join("");
}

export async function hashPassword(password, salt) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name:"PBKDF2", salt:encoder.encode(salt), iterations:100000, hash:"SHA-256" }, key, 256);
  return [...new Uint8Array(bits)].map(b=>b.toString(16).padStart(2,"0")).join("");
}

export function sessionCookie(token) { return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_DAYS*86400}`; }
export function clearSessionCookie() { return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`; }

export function getCookie(request, name) {
  const cookie = request.headers.get("cookie") || "";
  const match = cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function slugify(value) { return String(value || "").toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,90) || randomHex(4); }

export function sanitizeHtml(html = "") {
  let out = String(html || "");
  out = out.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");
  out = out.replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, "");
  out = out.replace(/\son\w+\s*=\s*(['"]).*?\1/gi, "");
  out = out.replace(/javascript:/gi, "");
  return out.slice(0, 900000);
}

export async function ensureSchema(env) {
  if (!env.DB) throw new Error("D1 binding DB is missing.");
  const statements = [
    `CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, first_name TEXT NOT NULL, last_name TEXT NOT NULL, username TEXT NOT NULL UNIQUE COLLATE NOCASE, password_hash TEXT NOT NULL, salt TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS sessions (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, token_hash TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, expires_at TEXT)`,
    `CREATE TABLE IF NOT EXISTS progress (user_id INTEGER PRIMARY KEY, progress_json TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS categories (id INTEGER PRIMARY KEY AUTOINCREMENT, parent_id INTEGER, title TEXT NOT NULL, slug TEXT NOT NULL UNIQUE, description TEXT DEFAULT '', sort_order INTEGER DEFAULT 0, status TEXT DEFAULT 'published')`,
    `CREATE TABLE IF NOT EXISTS notes (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, slug TEXT NOT NULL UNIQUE, summary TEXT DEFAULT '', content_html TEXT NOT NULL DEFAULT '', category_id INTEGER, status TEXT DEFAULT 'draft', published_at TEXT, updated_at TEXT DEFAULT CURRENT_TIMESTAMP, views INTEGER DEFAULT 0)`,
    `CREATE TABLE IF NOT EXISTS note_versions (id INTEGER PRIMARY KEY AUTOINCREMENT, note_id INTEGER NOT NULL, title TEXT NOT NULL, summary TEXT DEFAULT '', content_html TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS tags (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE COLLATE NOCASE, slug TEXT NOT NULL UNIQUE)`,
    `CREATE TABLE IF NOT EXISTS note_tags (note_id INTEGER NOT NULL, tag_id INTEGER NOT NULL, PRIMARY KEY(note_id, tag_id), FOREIGN KEY(note_id) REFERENCES notes(id) ON DELETE CASCADE, FOREIGN KEY(tag_id) REFERENCES tags(id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS bookmarks (user_id INTEGER NOT NULL, note_id INTEGER NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(user_id,note_id), FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY(note_id) REFERENCES notes(id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS flashcards (id INTEGER PRIMARY KEY AUTOINCREMENT, note_id INTEGER NOT NULL, front TEXT NOT NULL, back TEXT NOT NULL, sort_order INTEGER DEFAULT 0, FOREIGN KEY(note_id) REFERENCES notes(id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS practice_questions (id INTEGER PRIMARY KEY AUTOINCREMENT, note_id INTEGER NOT NULL, question TEXT NOT NULL, options_json TEXT NOT NULL, correct_answer TEXT NOT NULL, explanation TEXT DEFAULT '', sort_order INTEGER DEFAULT 0, FOREIGN KEY(note_id) REFERENCES notes(id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS footer_columns (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, sort_order INTEGER DEFAULT 0)`,
    `CREATE TABLE IF NOT EXISTS footer_links (id INTEGER PRIMARY KEY AUTOINCREMENT, column_id INTEGER NOT NULL, label TEXT NOT NULL, url TEXT NOT NULL, sort_order INTEGER DEFAULT 0, FOREIGN KEY(column_id) REFERENCES footer_columns(id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS note_views (id INTEGER PRIMARY KEY AUTOINCREMENT, note_id INTEGER NOT NULL, user_id INTEGER, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS search_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, query TEXT NOT NULL, user_id INTEGER, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS ratings (note_id INTEGER NOT NULL, user_id INTEGER NOT NULL, helpful INTEGER NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(note_id,user_id))`
  ];
  for (const sql of statements) await env.DB.prepare(sql).run();
  try { await env.DB.prepare("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'").run(); } catch {}
  const indexes = [
    "CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash)",
    "CREATE INDEX IF NOT EXISTS idx_notes_status ON notes(status)",
    "CREATE INDEX IF NOT EXISTS idx_notes_category ON notes(category_id)",
    "CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id)",
    "CREATE INDEX IF NOT EXISTS idx_search_logs_query ON search_logs(query)"
  ];
  for (const sql of indexes) await env.DB.prepare(sql).run();
}

export async function seedIfEmpty(env) {
  await ensureSchema(env);
  const count = await env.DB.prepare("SELECT COUNT(*) AS c FROM categories").first();
  if (count && count.c > 0) return;

  await env.DB.prepare("INSERT INTO categories (title, slug, description, sort_order, status) VALUES ('AP','ap','Advanced Placement study resources',0,'published')").run();
  const ap = await env.DB.prepare("SELECT id FROM categories WHERE slug='ap'").first();
  await env.DB.prepare("INSERT INTO categories (parent_id, title, slug, description, sort_order, status) VALUES (?, 'AP Microeconomics','ap-microeconomics','Units 1-6 notes and practice',0,'published')").bind(ap.id).run();
  const micro = await env.DB.prepare("SELECT id FROM categories WHERE slug='ap-microeconomics'").first();

  const unitTitles = [
    'Unit 1: Basic Economic Concepts',
    'Unit 2: Supply and Demand',
    'Unit 3: Production, Cost, and Perfect Competition',
    'Unit 4: Imperfect Competition',
    'Unit 5: Factor Markets',
    'Unit 6: Market Failure and the Role of Government'
  ];

  for (let i = 0; i < unitTitles.length; i++) {
    const title = unitTitles[i];
    await env.DB.prepare("INSERT INTO categories (parent_id,title,slug,description,sort_order,status) VALUES (?,?,?,?,?,'published')").bind(micro.id, title, slugify(title), `AP Micro ${title}`, i).run();
  }

  // create a sample note in Unit 2
  const unit2 = await env.DB.prepare("SELECT id FROM categories WHERE slug='unit-2-supply-and-demand'").first();
  if (unit2 && unit2.id) {
    await env.DB.prepare("INSERT INTO notes (title,slug,summary,content_html,category_id,status,published_at) VALUES (?,?,?,?,?,'published',CURRENT_TIMESTAMP)").bind(
      'Supply, Demand, and Elasticity Cheat Sheet','supply-demand-elasticity-cheat-sheet','Fast AP Micro review for shifts, equilibrium, shortage/surplus, and elasticity.',
      `<h2>Supply and Demand</h2><p>Demand shifts when non-price determinants change. Supply shifts when input costs, technology, taxes, subsidies, or seller expectations change.</p>`,
      unit2.id
    ).run();
    const note = await env.DB.prepare("SELECT id FROM notes WHERE slug='supply-demand-elasticity-cheat-sheet'").first();
    if (note && note.id) {
      await env.DB.prepare("INSERT INTO flashcards (note_id,front,back,sort_order) VALUES (?,?,?,0),(?,?,?,1)").bind(note.id,'Binding price ceiling?','Shortage if set below equilibrium.',note.id,'Per-unit tax increases supply price').run();
      await env.DB.prepare("INSERT INTO practice_questions (note_id,question,options_json,correct_answer,explanation) VALUES (?,?,?,?,?)").bind(note.id,'A binding price floor usually causes what?','["Surplus","Shortage","No effect","Lower prices"]','Surplus','When floor is above equilibrium it causes excess supply').run();
      for (const tag of ['AP Micro','Elasticity','Supply and Demand']) {
        await env.DB.prepare("INSERT OR IGNORE INTO tags (name,slug) VALUES (?,?)").bind(tag, slugify(tag)).run();
        const t = await env.DB.prepare("SELECT id FROM tags WHERE slug=?").bind(slugify(tag)).first();
        if (t && t.id) await env.DB.prepare("INSERT OR IGNORE INTO note_tags (note_id,tag_id) VALUES (?,?)").bind(note.id,t.id).run();
      }
    }
  }

  // footer seed
  const footerDefs = [
    [0,'Study Resources',[['AP Micro Notes','#'],['Practice Questions','#'],['Flashcards','#']]],
    [1,'Subjects',[['Economics','#'],['Mathematics','#'],['Science','#']]],
    [2,'Support',[['Contact','#'],['Help Center','#']]],
    [3,'Legal',[['Terms','#'],['Privacy','#']]]
  ];
  for (const [order,title,links] of footerDefs) {
    await env.DB.prepare("INSERT INTO footer_columns (title,sort_order) VALUES (?,?)").bind(title,order).run();
    const col = await env.DB.prepare("SELECT id FROM footer_columns WHERE title=?").bind(title).first();
    for (let i=0;i<links.length;i++) {
      await env.DB.prepare("INSERT INTO footer_links (column_id,label,url,sort_order) VALUES (?,?,?,?)").bind(col.id,links[i][0],links[i][1],i).run();
    }
  }
}

export async function createSession(env, userId) {
  await ensureSchema(env);
  const token = randomHex(32);
  const tokenHash = await sha256Hex(token);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400000).toISOString();
  // store token hash and expiry
  await env.DB.prepare("INSERT INTO sessions (user_id, token_hash, created_at, expires_at) VALUES (?,?,CURRENT_TIMESTAMP,?)").bind(userId, tokenHash, expiresAt).run();
  return token;
}

export async function getUserFromRequest(request, env) {
  await ensureSchema(env);
  const token = getCookie(request, SESSION_COOKIE);
  if (!token) return null;
  const tokenHash = await sha256Hex(token);
  const row = await env.DB.prepare(
    `SELECT users.id, users.first_name, users.last_name, users.username, COALESCE(users.role,'user') AS role
     FROM sessions JOIN users ON users.id = sessions.user_id
     WHERE sessions.token_hash = ? LIMIT 1`
  ).bind(tokenHash).first();
  return row || null;
}

// return { user } or { error: Response } so callers can return early
export async function requireUser(request, env) {
  const user = await getUserFromRequest(request, env);
  if (!user) return { error: json({ ok:false, error:"Not signed in" }, 401) };
  return { user };
}

// requireAdmin returns auth or error wrapper; caller should return auth.error if present
export async function requireAdmin(request, env) {
  const auth = await requireUser(request, env);
  if (auth.error) return auth;
  if (auth.user.role !== 'admin') return { error: json({ ok:false, error: "Admin access required" }, 403) };
  return auth;
}
