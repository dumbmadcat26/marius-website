# marius-web

Static Next.js portfolio for Marius Varhaugvik. Content comes from the Strapi app in `../marius-cms` at **build / dev** time (`output: 'export'`).

## Setup

1. Start Strapi: `cd ../marius-cms && npm run develop`
2. Copy env: `cp .env.example .env.local`
3. Install & run:

```bash
npm install
npm run dev
```

- Site: http://localhost:3000  
- CMS: http://localhost:1337  

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server (Turbopack) on port 3000 |
| `npm run build` | Static export → `out/` (dev-oriented; can bake localhost media) |
| `npm run build:static` | **Netlify / deploy:** copy uploads, relative `/uploads/` URLs, verify no localhost |
| `npm run lint` | ESLint |

## Static / Netlify media URLs

Dev `.env.local` sets `NEXT_PUBLIC_STRAPI_URL=http://localhost:1337` so images load from Strapi while editing.

For a deployable export, media must be **same-origin**:

```bash
# Strapi must be running
npm run build:static
```

That produces `/uploads/...` paths (not `http://localhost:1337/uploads/...`) and copies CMS media into `public/uploads/` → `out/uploads/`.

See the root `README.md` section **Deploying to Netlify**.

## Routes

| Path | Source |
|---|---|
| `/` | Projects + category/tag filters |
| `/projects/[slug]/` | Project detail |
| `/about/` | Site Setting (bio, contact, education, awards, …) |
