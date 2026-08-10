# Web_Marius_Migration

WordPress → Strapi migration for [mariusvarhaugvik.com](https://mariusvarhaugvik.com/).

## Layout

| Path | Contents |
|---|---|
| `marius-cms/` | Local Strapi 5 CMS (SQLite) |
| `Web_Marius_Original/` | WordPress XML + media export |
| `Web_Marius_Original/media-export-189650785-from-0-to-556/` | Source media (includes `.wav`) |
| `Web_Marius_Original/web/` | Output folder for converted AAC `.m4a` (created by script) |
| `Web_Marius_Migration_ChatGPT_Proposal/` | CSV/XLSX inventory |

WAV masters in the media export use **Git LFS**. After clone:

```powershell
git lfs install
git lfs pull
```

## Prerequisites (new machine)

1. **Git** + **Git LFS**
2. **Node.js 20.x or 22–24 LTS** (see `marius-cms/.nvmrc`). Avoid Node 26 on Windows for `better-sqlite3`.
3. **FFmpeg** (only needed for audio conversion):
   ```powershell
   winget install --id Gyan.FFmpeg.Essentials -e
   ffmpeg -version
   ```

## Clone & run Strapi

```powershell
git clone https://github.com/dumbmadcat26/marius-website.git
cd marius-website
git lfs install
git lfs pull

nvm use 20.19.4
cd marius-cms
npm install
npm run develop
```

Open http://localhost:1337/admin and create the first admin user.

More detail: [`marius-cms/README.md`](./marius-cms/README.md) · [`marius-cms/CONTENT_MODEL.md`](./marius-cms/CONTENT_MODEL.md)

## WordPress → Strapi import

Stop `npm run develop` first (SQLite lock).

```powershell
cd marius-cms
npm run parse:wp
npm run import:wp
# optional: npm run import:wp -- --all-media
npm run develop
```

## Convert WAV → web AAC + link in Strapi

Stop `develop` before running (needed for the Strapi sync step).

```powershell
cd marius-cms
npm run convert:audio
```

What it does:

1. Converts every `.wav` under the media export to **AAC `.m4a` at 256 kbps, stereo** (sample rate preserved)
2. Leaves original WAV files untouched
3. Writes outputs to `Web_Marius_Original/web/` (same relative paths, `.m4a` extension)
4. Skips files that already have a matching `.m4a`
5. Uploads each `.m4a` into Strapi Media Library if missing
6. Attaches it to existing **Project** `audioFiles` that already reference the matching `.wav` (no duplicate projects)

```powershell
npm run convert:audio:files    # ffmpeg only
npm run convert:audio:strapi   # Strapi upload/link only
```

Options:

```powershell
node scripts/convert-wav-to-web.js --force
node scripts/convert-wav-to-web.js --input "D:\path\to\wavs" --output "D:\path\to\web"
node scripts/convert-wav-to-web.js --dry-run
```

## Script reference

| Command | Purpose |
|---|---|
| `npm run parse:wp` | Parse WordPress XML → `scripts/parsed-projects.json` |
| `npm run import:wp` | Import projects + linked media into Strapi |
| `npm run convert:audio` | WAV → AAC + Strapi link |
| `npm run convert:audio:files` | Conversion only |
| `npm run convert:audio:strapi` | Strapi sync only |

## Troubleshooting

| Problem | Fix |
|---|---|
| `better-sqlite3` / node-gyp | Use Node 20/24 (`nvm use 20.19.4`) |
| WAV files are tiny text pointers | Run `git lfs pull` |
| DB lock on import/convert | Stop `strapi develop`, run script, restart |
| `ffmpeg not found` | Install FFmpeg Essentials via winget (above) |
| Disk full | Free space before convert (outputs need room) |
