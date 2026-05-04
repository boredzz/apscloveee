# AP Notes Platform - Cloudflare Pages + D1

This project keeps the original static Cloudflare Pages structure and adds a dark educational notes platform with categories, notes, search, bookmarks, progress tracking, and an admin dashboard.

## Cloudflare settings

Use the existing Cloudflare Pages settings:

- Framework preset: None
- Build command: `npm run build`
- Build output directory: `/`
- Functions directory: `/functions/api`
- D1 binding variable: `DB`
- D1 database name: `apsite`
- D1 database ID: `4108ce12-cf77-47c1-8927-43d65030d036`

## Local setup

```bash
npm install
npm run db:init
npm run dev
```

## Deploy

Push to the connected GitHub repository and let Cloudflare Pages build with:

```bash
npm run build
```

Or deploy manually:

```bash
npm run deploy
```

## Admin account

The first registered user automatically becomes `admin`.

If you already have users and need to promote one manually, run:

```sql
UPDATE users SET role = 'admin' WHERE username = 'YOUR_USERNAME';
```

Then open:

```text
/admin is handled inside the single page app by clicking Admin Panel after login.
```

## Main features

- Dark responsive study platform
- Collapsible nested categories
- Global search with suggestions
- Notes open inside the website, not PDFs
- Quick summaries
- Exam Mode
- Bookmarks
- Progress tracking
- Flashcards
- MCQs with explanations
- Admin dashboard
- Category manager
- Rich text note editor
- Draft/published notes
- Version storage on note edits
- Editable footer manager
- User role management

## Important files

- `index.html` - main app and admin UI
- `functions/api` - Cloudflare Pages Functions API
- `schema.sql` - D1 schema
- `wrangler.toml` - Cloudflare D1 binding
