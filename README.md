# Web_Marius_Migration

WordPress → Strapi migration for [mariusvarhaugvik.com](https://mariusvarhaugvik.com/).

## Repository layout

| Path | Contents |
|---|---|
| `marius-cms/` | Local Strapi 5 CMS (SQLite) |
| `Web_Marius_Original/` | WordPress XML export + full media export |
| `Web_Marius_Original/media-export-189650785-from-0-to-556/` | Local media assets (~134 files, ~994 MB) |
| `Web_Marius_Migration_ChatGPT_Proposal/` | CSV/XLSX content inventory |

### Media & Git LFS

- **Images** (jpg/png/webp/…) are stored as normal Git blobs.
- **WAV audio** is stored with **Git LFS** (required: at least one file is >100 MB, which GitHub rejects without LFS).
- After clone, LFS files download automatically if Git LFS is installed.

## Prerequisites (new machine)

1. **Git** + **Git LFS**
   ```powershell
   git --version
   git lfs version
   # if missing: https://git-lfs.com  or  winget install GitHub.GitLFS
   git lfs install
   ```
2. **Node.js 20.x or 22–24 LTS** (recommended: 20.19.4 via nvm-windows).  
   Avoid Node 26 on Windows for this project: `better-sqlite3` has no prebuild and needs Visual Studio C++ tools.
   ```powershell
   nvm install 20.19.4
   nvm use 20.19.4
   node -v   # should print v20.x
   ```
3. **npm** (ships with Node). Yarn is optional.

## Clone & fetch media

```powershell
git clone <your-remote-url> Web_Marius_Migration
cd Web_Marius_Migration
git lfs install
git lfs pull
```

Confirm media is present:

```powershell
(Get-ChildItem Web_Marius_Original\media-export-189650785-from-0-to-556 -Recurse -File).Count
# expect 134
```

If WAV files are tiny pointer files instead of audio, LFS did not pull — run `git lfs pull` again and check `git lfs env`.

## Install & run Strapi

```powershell
cd marius-cms
npm install
npm run develop
```

1. Open http://localhost:1337/admin  
2. Create the first administrator account  
3. Content types are already defined; bootstrap seeds categories, tags, About/Contact pages, site settings, and public `find` / `findOne` permissions

More CMS detail: [`marius-cms/README.md`](./marius-cms/README.md) and [`marius-cms/CONTENT_MODEL.md`](./marius-cms/CONTENT_MODEL.md).

### Environment

`marius-cms/.env` is generated locally and **not** committed. On a fresh machine, `npm run develop` / first Strapi start creates secrets. You can also copy from `.env.example` and fill values.

## Migration scripts (WordPress → Strapi)

Scripts live in `marius-cms/scripts/`.

| Command | What it does |
|---|---|
| `npm run parse:wp` | Reads the WordPress XML + local media folder, writes `scripts/parsed-projects.json` |
| `npm run import:wp` | Uploads linked media into Strapi and creates Project entries |
| `npm run import:wp -- --all-media` | Same, plus uploads media files not referenced by any parsed project |

### Important

- **Stop** `npm run develop` before importing (SQLite cannot be used by two processes).
- Use the same Node version as above.
- Re-running import skips projects that already exist (by slug) and reuses media already in the library (by filename).

### Full import on a new machine

```powershell
nvm use 20.19.4
cd marius-cms

# terminal A — first-time admin setup only
npm install
npm run develop
# create admin at http://localhost:1337/admin, then stop the server (Ctrl+C)

# terminal B — import
npm run parse:wp
npm run import:wp

# bring CMS back up
npm run develop
```

Expected ballpark after a clean import: **~42 projects**, **~98** linked media files (more if you used `--all-media`).

### Useful API checks

```text
GET http://localhost:1337/api/categories
GET http://localhost:1337/api/projects?pagination[pageSize]=100&populate=*
GET http://localhost:1337/api/site-setting?populate=*
```

## Content model (short)

| Strapi type | Role |
|---|---|
| **Category** | Performing arts / Music / Motion graphics |
| **Project** | Individual works (role, venue, year, gallery, audio, embeds) |
| **Tag** | Cross-cutting labels |
| **Page** | About, Contact |
| **Site Setting** | Brand name, tagline, bio, socials |

## Troubleshooting

| Problem | Fix |
|---|---|
| `better-sqlite3` / node-gyp / Visual Studio errors | Switch to Node 20 or 24 LTS (`nvm use 20.19.4`) |
| WAV files are ~130-byte text pointers | Install Git LFS, run `git lfs install` && `git lfs pull` |
| Import fails with database lock | Stop `strapi develop`, run import, then start again |
| `EADDRINUSE` on port 1337 | Kill the process on 1337 or change `PORT` in `.env` |
| PATH still shows Node 26 after `nvm use` | Prefer the nvm path explicitly, e.g. put `%NVM_HOME%\v20.19.4` first on `PATH` |

## Remote

Add your GitHub remote when ready:

```powershell
git remote add origin <url>
git push -u origin master
```

Large first push may take several minutes (LFS WAV + image history). If a push times out, push again; LFS uploads resume.
