# Marius CMS (Strapi)

Local Strapi 5 backend for migrating [mariusvarhaugvik.com](https://mariusvarhaugvik.com/) off WordPress.

## Requirements

Use **Node 20.x or 22–24 LTS** (see `.nvmrc`). Node 26 is listed by Strapi but `better-sqlite3` has no Windows prebuilds for it yet, so native compilation fails without Visual Studio C++ tools.

```powershell
nvm use 20.19.4
# or: nvm install 24.19.0 && nvm use 24.19.0
```

## Start

```powershell
cd marius-cms
npm run develop
```

Open `http://localhost:1337/admin` and create the first admin user.

## Content model

See [CONTENT_MODEL.md](./CONTENT_MODEL.md). Bootstrap seeds categories, tags, About/Contact pages, site settings, and public `find`/`findOne` permissions.

## Source data

| Asset | Path |
|---|---|
| WordPress XML | `../Web_Marius_Original/mariusvarhaugvik.WordPress.2026-08-10_All_Original.xml` |
| Media export | `../Web_Marius_Original/media-export-189650785-from-0-to-556/` |
| CSV inventory | `../Web_Marius_Migration_ChatGPT_Proposal/CSV/` |
