# Marius Varhaugvik — CMS + portfolio site

WordPress → Strapi content, with a static Next.js frontend.

| Path | Contents |
|---|---|
| `marius-cms/` | Strapi 5 CMS (SQLite + media in `public/uploads`) |
| `marius-web/` | Static Next.js site (reads Strapi at build/dev time) |
| `Web_Marius_Original/` | WordPress XML + original media export |

Large media uses **Git LFS** (upload MP3s + original export WAVs).

## Prerequisites

1. **Git** + **Git LFS**
2. **Node.js 20.x or 22–24 LTS** (`marius-cms/.nvmrc`)
3. **FFmpeg** (optional — only for re-converting audio)

```bash
# macOS
brew install ffmpeg

# Windows
winget install --id Gyan.FFmpeg.Essentials -e
```

## Setup

```bash
git clone https://github.com/dumbmadcat26/marius-website.git
cd marius-website
git lfs install
git lfs pull

# CMS
cd marius-cms
cp .env.example .env   # then generate real secrets (see below)
nvm use                # or: nvm use 20.19.4
npm install
npm run develop
```

CMS admin: http://localhost:1337/admin  
(Create the first admin user on first boot if prompted.)

```bash
# Frontend (second terminal; Strapi must be running)
cd marius-web
cp .env.example .env.local
npm install
npm run dev
```

Site: http://localhost:3000

### Strapi `.env` secrets

Do not commit `.env`. Generate values:

```bash
node -e "console.log(require('crypto').randomBytes(16).toString('base64url'))"  # APP_KEYS ×4
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"  # other secrets
```

Required keys (see `marius-cms/.env.example`):

`HOST`, `PORT`, `APP_KEYS`, `API_TOKEN_SALT`, `ADMIN_JWT_SECRET`, `TRANSFER_TOKEN_SALT`, `JWT_SECRET`, `ENCRYPTION_KEY`

### Frontend env

`marius-web/.env.local` (for **local development** only):

```env
STRAPI_URL=http://localhost:1337
NEXT_PUBLIC_STRAPI_URL=http://localhost:1337
```

| Variable | Role |
|---|---|
| `STRAPI_URL` | Where Next fetches content at build/dev time (API only) |
| `NEXT_PUBLIC_STRAPI_URL` | Prefixed onto image/audio paths in the browser |

**Important for Netlify / static deploy:** do **not** use plain `npm run build` after copying `.env.example` → `.env.local`. That can bake `http://localhost:1337/uploads/...` into HTML. Always use:

```bash
cd marius-web
npm run build:static
```

That script:

1. Copies `marius-cms/public/uploads/` → `marius-web/public/uploads/`
2. Builds with empty media base → relative `/uploads/...` URLs
3. Verifies the export contains **no** `localhost` URLs

Production builds also ignore localhost in `NEXT_PUBLIC_STRAPI_URL`, so a fresh clone with a typical `.env.local` will still emit relative media paths when you run `build:static`.

## Daily commands

| Command | Where | Purpose |
|---|---|---|
| `npm run develop` | `marius-cms` | Strapi admin + API |
| `npm run dev` | `marius-web` | Next.js portfolio |
| `npm run build` | `marius-web` | Static export only (may keep localhost media if env is wrong) |
| `npm run build:static` | `marius-web` | **Use this for Netlify** — copy uploads + relative media URLs + verify |

## Deploying to Netlify (static)

The frontend is already a **fully static export** (`output: "export"` in `next.config.ts`). Content from the SQLite database is fetched from Strapi at **build time** and baked into HTML. Media files must ship as static files under `/uploads/`.

**What gets deployed:** only `marius-web/out/` (or a copy of it) — not Strapi, not the database file at runtime.

### Media URLs (must be relative)

After a correct static build, images and audio look like:

```
/uploads/medium_example.jpg
/uploads/track_abc123.mp3
```

**Wrong** (broken on Netlify / any other machine):

```
http://localhost:1337/uploads/medium_example.jpg
```

If you see localhost in the deployed site: rebuild with `npm run build:static`, confirm `node scripts/verify-static-urls.mjs` passes, then redeploy `out/`.

### Local static build (recommended)

1. `git lfs pull` (media files).
2. Start Strapi (`cd marius-cms && npm run develop`).
3. In a second terminal:

```bash
cd marius-web
npm run build:static
```

4. Deploy `marius-web/out/` to Netlify (drag-and-drop, CLI, or push a separate static repo).

### Netlify Git deploy

A `netlify.toml` is included at the repo root. **Strapi must be running during the Netlify build** so Next.js can fetch project data. The simplest path is to run `build:static` locally (or in your own CI) and publish `out/`.

### What is / isn't included

| Included in static site | Not on Netlify (unless you host separately) |
|---|---|
| All project pages, about page, filters | Strapi admin UI |
| Images & audio under `/uploads/` | Live CMS editing |
| Content baked in at build time | SQLite at runtime |

After CMS edits, re-run `build:static` and redeploy.

## Content / media notes

- Portfolio content lives in SQLite at `marius-cms/.tmp/data.db` (tracked in git).
- Uploaded media lives in `marius-cms/public/uploads/` (MP3 audio via LFS).
- Site Setting holds About copy, contact, and portrait.
- Work pages filter by category; project pages include gallery + audio.

### Optional: re-convert upload audio WAV → MP3

Stop Strapi first (SQLite lock), then:

```bash
cd marius-cms
npm run convert:uploads:mp3
```

Uses ffmpeg **320 kbps** MP3 and updates SQLite file URLs in place.

### Optional: WordPress import / AAC pipeline

See older helpers in `marius-cms/scripts/` (`parse:wp`, `import:wp`, `convert:audio`). Only needed if re-importing from the WordPress export.

## Troubleshooting

| Problem | Fix |
|---|---|
| Tiny audio / media files | `git lfs pull` |
| `better-sqlite3` build errors | Use Node 20/24 (`nvm use`) |
| DB locked | Stop `npm run develop`, then run scripts |
| About image / content missing on site | Ensure Strapi is running; restart `marius-web` dev server |
| Images/audio point at `localhost:1337` on Netlify | Rebuild with `npm run build:static` (not `npm run build`); verify with `node scripts/verify-static-urls.mjs` |
| `ffmpeg not found` | Install FFmpeg (above) |
