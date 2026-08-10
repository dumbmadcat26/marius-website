# Web_Marius_Migration

WordPress → Strapi migration for [mariusvarhaugvik.com](https://mariusvarhaugvik.com/).

## Layout

| Path | Contents |
|---|---|
| `marius-cms/` | Local Strapi 5 CMS (SQLite) |
| `Web_Marius_Original/` | WordPress XML export + media export folder |
| `Web_Marius_Migration_ChatGPT_Proposal/` | CSV/XLSX content inventory |

Binary media under `Web_Marius_Original/media-export-*` is gitignored (~1GB). Keep it locally for imports.

## Quick start

```powershell
nvm use 20.19.4
cd marius-cms
npm install
npm run develop
```

Admin: http://localhost:1337/admin

Import from WordPress (stop `develop` first):

```powershell
npm run parse:wp
npm run import:wp
# optional: also upload unreferenced media files
npm run import:wp -- --all-media
```
