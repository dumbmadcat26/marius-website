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
| `npm run build` | Static export → `out/` |
| `npm run lint` | ESLint |

## Routes

| Path | Source |
|---|---|
| `/` | Projects + category/tag filters |
| `/projects/[slug]/` | Project detail |
| `/about/` | Site Setting (bio, contact, education, awards, …) |
