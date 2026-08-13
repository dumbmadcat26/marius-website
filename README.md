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

`marius-web/.env.local`:

```env
STRAPI_URL=http://localhost:1337
NEXT_PUBLIC_STRAPI_URL=http://localhost:1337
```

## Daily commands

| Command | Where | Purpose |
|---|---|---|
| `npm run develop` | `marius-cms` | Strapi admin + API |
| `npm run dev` | `marius-web` | Next.js portfolio |
| `npm run build` | `marius-web` | Static export → `marius-web/out/` |

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
| `ffmpeg not found` | Install FFmpeg (above) |
