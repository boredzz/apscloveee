# Cloudflare Setup

This app now uses Cloudflare Pages Functions for login, so do not use the drag-and-drop uploader.

Use Wrangler from the terminal.

## Files That Must Be Deployed

```text
index.html
404.html
functions/
schema.sql
```

`wrangler.toml` contains the D1 binding for Wrangler deploys.

## Install

```bash
npm install
```

Then log in:

```bash
npx wrangler login
```

## D1 Setup

Run the schema:

```bash
npm run db:init
```

## Deploy

```bash
npm run deploy
```

After deployment, the login API routes should work:

```text
/api/register
/api/login
/api/logout
/api/me
/api/progress
```


