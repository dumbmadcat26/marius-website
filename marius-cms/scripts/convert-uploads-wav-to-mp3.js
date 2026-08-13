/**
 * Convert Strapi upload WAVs → high-quality MP3 and update SQLite file rows.
 * Stop `npm run develop` before running (SQLite lock).
 *
 *   node scripts/convert-uploads-wav-to-mp3.js
 *   node scripts/convert-uploads-wav-to-mp3.js --dry-run
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const sqlite3 = require('better-sqlite3');

const APP_DIR = path.resolve(__dirname, '..');
const UPLOADS = path.join(APP_DIR, 'public', 'uploads');
const DB_PATH = path.join(APP_DIR, '.tmp', 'data.db');
const DRY = process.argv.includes('--dry-run');

function findFfmpeg() {
  try {
    execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' });
    return 'ffmpeg';
  } catch {
    throw new Error('ffmpeg not found on PATH');
  }
}

function convert(ffmpeg, wavPath, mp3Path) {
  execFileSync(
    ffmpeg,
    [
      '-y',
      '-i',
      wavPath,
      '-codec:a',
      'libmp3lame',
      '-b:a',
      '320k',
      '-ar',
      '44100',
      '-ac',
      '2',
      mp3Path,
    ],
    { stdio: 'ignore' },
  );
}

function main() {
  const ffmpeg = findFfmpeg();
  if (!fs.existsSync(DB_PATH)) {
    throw new Error(`SQLite DB not found: ${DB_PATH}`);
  }

  const db = sqlite3(DB_PATH);
  const rows = db
    .prepare(
      `SELECT id, name, hash, ext, mime, url, size
       FROM files
       WHERE lower(ext) = '.wav'
          OR lower(mime) LIKE '%wav%'
          OR lower(url) LIKE '%.wav'`,
    )
    .all();

  console.log(`Found ${rows.length} WAV file record(s)${DRY ? ' (dry-run)' : ''}`);

  let converted = 0;
  let skipped = 0;
  let errors = 0;

  const update = db.prepare(
    `UPDATE files
     SET name = @name,
         hash = @hash,
         ext = '.mp3',
         mime = 'audio/mpeg',
         url = @url,
         size = @size,
         updated_at = @updatedAt
     WHERE id = @id`,
  );

  const tx = db.transaction((row) => {
    const wavNameOnDisk = `${row.hash}.wav`;
    const wavPath = path.join(UPLOADS, wavNameOnDisk);
    const mp3Path = path.join(UPLOADS, `${row.hash}.mp3`);

    if (!fs.existsSync(wavPath)) {
      console.warn(`skip missing file: ${wavNameOnDisk}`);
      skipped += 1;
      return;
    }

    if (DRY) {
      console.log(`would convert ${wavNameOnDisk} → ${path.basename(mp3Path)}`);
      converted += 1;
      return;
    }

    convert(ffmpeg, wavPath, mp3Path);
    const stats = fs.statSync(mp3Path);
    const sizeKb = Math.round((stats.size / 1024) * 100) / 100;
    const baseName = String(row.name || wavNameOnDisk).replace(/\.wav$/i, '.mp3');

    update.run({
      id: row.id,
      name: baseName,
      hash: row.hash,
      url: `/uploads/${row.hash}.mp3`,
      size: sizeKb,
      updatedAt: Date.now(),
    });

    fs.unlinkSync(wavPath);
    console.log(`ok  ${wavNameOnDisk} → ${row.hash}.mp3 (${sizeKb} KB)`);
    converted += 1;
  });

  for (const row of rows) {
    try {
      tx(row);
    } catch (err) {
      errors += 1;
      console.error(`fail ${row.hash}: ${err.message}`);
    }
  }

  db.close();
  console.log(`\nDone. converted=${converted} skipped=${skipped} errors=${errors}`);
}

main();
