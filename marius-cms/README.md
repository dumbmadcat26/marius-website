# Marius CMS (Strapi)

Local Strapi 5 backend for migrating [mariusvarhaugvik.com](https://mariusvarhaugvik.com/) off WordPress.

For **full new-machine setup** (Git LFS, media assets, import order), see the [repository README](../README.md).

## Requirements

Use **Node 20.x or 22–24 LTS** (see `.nvmrc`). Node 26 on Windows often fails installing `better-sqlite3` without Visual Studio C++ build tools.

```powershell
nvm use 20.19.4
```

## Start

```powershell
cd marius-cms
npm install
npm run develop
```

Open `http://localhost:1337/admin` and create the first admin user.

## Content model

See [CONTENT_MODEL.md](./CONTENT_MODEL.md). Bootstrap seeds categories, tags, About/Contact pages, site settings, and public `find`/`findOne` permissions.

## Migration scripts

Stop `develop` before importing (SQLite lock).

```powershell
npm run parse:wp    # XML + local media → scripts/parsed-projects.json
npm run import:wp   # upload media + create projects
npm run import:wp -- --all-media   # also upload unreferenced files
```

## Source data

| Asset | Path |
|---|---|
| WordPress XML | `../Web_Marius_Original/mariusvarhaugvik.WordPress.2026-08-10_All_Original.xml` |
| Media export | `../Web_Marius_Original/media-export-189650785-from-0-to-556/` |
| CSV inventory | `../Web_Marius_Migration_ChatGPT_Proposal/CSV/` |
