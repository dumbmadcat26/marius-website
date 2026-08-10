/**
 * Convert WAV masters → web AAC (.m4a) and link them in Strapi.
 *
 * Encoding: AAC-LC, 256 kbps, stereo, original sample rate kept.
 * Originals are never modified/deleted.
 * Outputs: Web_Marius_Original/web/<mirrored-relative-path>/<name>.m4a
 *
 * Usage (from marius-cms; stop `npm run develop` before --strapi):
 *   node scripts/convert-wav-to-web.js
 *   node scripts/convert-wav-to-web.js --convert-only
 *   node scripts/convert-wav-to-web.js --strapi-only
 *   node scripts/convert-wav-to-web.js --force
 *   node scripts/convert-wav-to-web.js --input "D:\\path\\to\\wavs"
 */

const { spawnSync, execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { createStrapi } = require('@strapi/strapi');

const APP_DIR = path.resolve(__dirname, '..');
const WORKSPACE = path.resolve(APP_DIR, '..');
const DEFAULT_INPUT = path.join(
  WORKSPACE,
  'Web_Marius_Original',
  'media-export-189650785-from-0-to-556'
);
const DEFAULT_WEB_ROOT = path.join(WORKSPACE, 'Web_Marius_Original', 'web');

const BITRATE = '256k';

function parseArgs(argv) {
  const args = {
    input: DEFAULT_INPUT,
    output: DEFAULT_WEB_ROOT,
    force: false,
    dryRun: false,
    convertOnly: false,
    strapiOnly: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--force') args.force = true;
    else if (a === '--dry-run') args.dryRun = true;
    else if (a === '--convert-only') args.convertOnly = true;
    else if (a === '--strapi-only') args.strapiOnly = true;
    else if (a === '--input') {
      args.input = path.resolve(argv[++i]);
    } else if (a === '--output') {
      args.output = path.resolve(argv[++i]);
    } else if (a === '--help' || a === '-h') {
      args.help = true;
    }
  }

  if (args.convertOnly && args.strapiOnly) {
    throw new Error('Use only one of --convert-only or --strapi-only');
  }
  return args;
}

function printHelp() {
  console.log(`Convert WAV → AAC .m4a (256k stereo) and sync into Strapi audioFiles.

Options:
  --input <dir>     Source directory of .wav files (default: media export)
  --output <dir>    Web output root (default: Web_Marius_Original/web)
  --force           Re-encode even if .m4a already exists
  --convert-only    Skip Strapi upload/link step
  --strapi-only     Skip ffmpeg; only upload/link existing .m4a files
  --dry-run         Print actions without writing or calling Strapi
`);
}

function resolveFfmpeg() {
  const which = spawnSync(process.platform === 'win32' ? 'where.exe' : 'which', ['ffmpeg'], {
    encoding: 'utf8',
  });
  if (which.status === 0) {
    const first = which.stdout
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean)[0];
    if (first) return first;
  }

  const candidates = [
    path.join(WORKSPACE, 'tools', 'ffmpeg', 'bin', 'ffmpeg.exe'),
    path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'WinGet', 'Links', 'ffmpeg.exe'),
    path.join(process.env.ProgramFiles || 'C:\\Program Files', 'ffmpeg', 'bin', 'ffmpeg.exe'),
    path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'WinGet', 'Packages'),
    'C:\\ffmpeg\\bin\\ffmpeg.exe',
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    if (candidate.endsWith('Packages') && fs.existsSync(candidate)) {
      const found = walkForFile(candidate, 'ffmpeg.exe');
      if (found) return found;
    } else if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

function walkForFile(dir, filename, depth = 0) {
  if (depth > 6) return null;
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return null;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isFile() && entry.name.toLowerCase() === filename.toLowerCase()) return full;
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const found = walkForFile(path.join(dir, entry.name), filename, depth + 1);
    if (found) return found;
  }
  return null;
}

function walkFiles(dir, predicate, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Never recurse into the web output if it sits inside input
      if (path.resolve(full) === path.resolve(DEFAULT_WEB_ROOT)) continue;
      walkFiles(full, predicate, out);
    } else if (entry.isFile() && predicate(entry.name, full)) {
      out.push(full);
    }
  }
  return out;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function formatMb(bytes) {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function relativeTo(from, file) {
  return path.relative(from, file);
}

function mapWavToOutput(wavPath, inputRoot, outputRoot) {
  const rel = relativeTo(inputRoot, wavPath);
  const relOut = rel.replace(/\.wav$/i, '.m4a');
  return path.join(outputRoot, relOut);
}

function convertWav(ffmpeg, wavPath, m4aPath, { force, dryRun }) {
  ensureDir(path.dirname(m4aPath));

  if (!force && fs.existsSync(m4aPath)) {
    return { status: 'skipped', reason: 'exists' };
  }

  const wavSize = fs.statSync(wavPath).size;
  console.log(`convert  ${relativeTo(WORKSPACE, wavPath)}`);
  console.log(`      ->  ${relativeTo(WORKSPACE, m4aPath)}`);

  if (dryRun) {
    return { status: 'dry-run', wavSize, outSize: 0 };
  }

  // Args array keeps spaces/special characters safe (no shell interpolation).
  const args = [
    '-hide_banner',
    '-loglevel',
    'error',
    '-y',
    '-i',
    wavPath,
    '-vn',
    '-c:a',
    'aac',
    '-b:a',
    BITRATE,
    '-ac',
    '2',
    '-movflags',
    '+faststart',
    m4aPath,
  ];

  const result = spawnSync(ffmpeg, args, {
    encoding: 'utf8',
    windowsHide: true,
  });

  if (result.status !== 0) {
    const err = (result.stderr || result.stdout || '').trim() || `exit ${result.status}`;
    return { status: 'error', error: err, wavSize };
  }

  if (!fs.existsSync(m4aPath)) {
    return { status: 'error', error: 'ffmpeg reported success but output missing', wavSize };
  }

  const outSize = fs.statSync(m4aPath).size;
  const saved = ((1 - outSize / wavSize) * 100).toFixed(1);
  console.log(
    `   ok     ${formatMb(wavSize)} → ${formatMb(outSize)} (${saved}% smaller)`
  );
  return { status: 'converted', wavSize, outSize };
}

async function uploadM4a(strapi, filePath) {
  const originalFilename = path.basename(filePath);
  const existing = await strapi.db.query('plugin::upload.file').findOne({
    where: { name: originalFilename },
  });
  if (existing) return { file: existing, created: false };

  const stats = fs.statSync(filePath);
  const uploaded = await strapi.plugin('upload').service('upload').upload({
    data: {
      fileInfo: {
        name: originalFilename,
        alternativeText: originalFilename,
        caption: `Web AAC from ${originalFilename.replace(/\.m4a$/i, '.wav')}`,
      },
    },
    files: {
      filepath: filePath,
      originalFilename,
      mimetype: 'audio/mp4',
      size: stats.size,
    },
  });

  const file = Array.isArray(uploaded) ? uploaded[0] : uploaded;
  return { file, created: true };
}

function baseKey(filename) {
  return path.basename(filename, path.extname(filename)).toLowerCase();
}

async function syncStrapi(webRoot, { dryRun }) {
  console.log('\n=== Strapi sync ===');
  if (dryRun) {
    console.log('[dry-run] would load Strapi and link .m4a into project audioFiles');
    return { linked: 0, uploaded: 0, skipped: 0, unmatched: 0 };
  }

  process.chdir(APP_DIR);
  const strapi = await createStrapi({ distDir: './dist' }).load();

  const stats = { linked: 0, uploaded: 0, skipped: 0, unmatched: 0, errors: 0 };

  try {
    const m4aFiles = walkFiles(webRoot, (name) => /\.m4a$/i.test(name));
    console.log(`Found ${m4aFiles.length} web .m4a file(s) to sync`);

    const uploadFiles = await strapi.db.query('plugin::upload.file').findMany({});
    const uploadsByName = new Map();
    const uploadsByBase = new Map();
    for (const file of uploadFiles) {
      const name = String(file.name || '').toLowerCase();
      uploadsByName.set(name, file);
      const key = baseKey(file.name || '');
      if (!uploadsByBase.has(key)) uploadsByBase.set(key, []);
      uploadsByBase.get(key).push(file);
    }

    const projects = await strapi.db.query('api::project.project').findMany({
      populate: { audioFiles: true },
    });

    for (const m4aPath of m4aFiles) {
      const m4aName = path.basename(m4aPath);
      const key = baseKey(m4aName);
      const wavName = `${path.basename(m4aName, path.extname(m4aName))}.wav`;

      try {
        let m4aUpload = uploadsByName.get(m4aName.toLowerCase());
        if (!m4aUpload) {
          const result = await uploadM4a(strapi, m4aPath);
          m4aUpload = result.file;
          uploadsByName.set(m4aName.toLowerCase(), m4aUpload);
          if (result.created) {
            stats.uploaded += 1;
            console.log(`upload   ${m4aName}`);
          }
        } else {
          console.log(`exists   ${m4aName} (media library)`);
        }

        const relatedProjects = projects.filter((project) => {
          const audio = project.audioFiles || [];
          return audio.some((f) => {
            const n = String(f.name || '').toLowerCase();
            return n === wavName.toLowerCase() || baseKey(f.name || '') === key;
          });
        });

        if (!relatedProjects.length) {
          stats.unmatched += 1;
          console.log(`orphan   ${m4aName} (no project references ${wavName})`);
          continue;
        }

        for (const project of relatedProjects) {
          const audio = project.audioFiles || [];
          const already = audio.some((f) => f.id === m4aUpload.id || String(f.name).toLowerCase() === m4aName.toLowerCase());
          if (already) {
            stats.skipped += 1;
            console.log(`linked   ${project.title} ← ${m4aName} (already)`);
            continue;
          }

          const nextIds = [...audio.map((f) => f.id), m4aUpload.id];
          await strapi.documents('api::project.project').update({
            documentId: project.documentId,
            data: {
              audioFiles: nextIds,
            },
            status: project.publishedAt ? 'published' : 'draft',
          });

          // Keep in-memory project list in sync for later files
          project.audioFiles = [...audio, m4aUpload];
          stats.linked += 1;
          console.log(`linked   ${project.title} ← ${m4aName}`);
        }
      } catch (error) {
        stats.errors += 1;
        console.error(`error    ${m4aName}: ${error.message || error}`);
      }
    }
  } finally {
    await strapi.destroy();
  }

  return stats;
}

async function runConvert(options, ffmpeg) {
  console.log('=== WAV → AAC (.m4a) ===');
  console.log(`input : ${options.input}`);
  console.log(`output: ${options.output}`);
  console.log(`codec : aac ${BITRATE} stereo (sample rate preserved)`);
  console.log(`ffmpeg: ${ffmpeg}`);

  if (!fs.existsSync(options.input)) {
    throw new Error(`Input directory not found: ${options.input}`);
  }

  ensureDir(options.output);
  const wavs = walkFiles(options.input, (name) => /\.wav$/i.test(name));
  console.log(`Found ${wavs.length} WAV file(s)\n`);

  const summary = {
    converted: 0,
    skipped: 0,
    errors: 0,
    wavBytes: 0,
    outBytes: 0,
  };

  for (const wavPath of wavs) {
    const m4aPath = mapWavToOutput(wavPath, options.input, options.output);
    try {
      const result = convertWav(ffmpeg, wavPath, m4aPath, options);
      if (result.status === 'skipped') {
        summary.skipped += 1;
        const size = fs.existsSync(m4aPath) ? fs.statSync(m4aPath).size : 0;
        summary.outBytes += size;
        summary.wavBytes += fs.statSync(wavPath).size;
        console.log(`skip     ${relativeTo(options.input, wavPath)} (already converted)`);
      } else if (result.status === 'error') {
        summary.errors += 1;
        console.error(`ERROR    ${relativeTo(options.input, wavPath)}`);
        console.error(`         ${result.error}`);
      } else if (result.status === 'converted' || result.status === 'dry-run') {
        summary.converted += 1;
        summary.wavBytes += result.wavSize || 0;
        summary.outBytes += result.outSize || 0;
      }
    } catch (error) {
      summary.errors += 1;
      console.error(`ERROR    ${relativeTo(options.input, wavPath)}`);
      console.error(`         ${error.message || error}`);
    }
  }

  console.log('\nConversion summary');
  console.log(`  converted: ${summary.converted}`);
  console.log(`  skipped:   ${summary.skipped}`);
  console.log(`  errors:    ${summary.errors}`);
  if (!options.dryRun && summary.wavBytes) {
    console.log(`  WAV total: ${formatMb(summary.wavBytes)}`);
    console.log(`  M4A total: ${formatMb(summary.outBytes)}`);
    console.log(`  saved:     ${formatMb(Math.max(0, summary.wavBytes - summary.outBytes))}`);
  }
  return summary;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const doConvert = !options.strapiOnly;
  const doStrapi = !options.convertOnly;

  if (doConvert) {
    const ffmpeg = resolveFfmpeg();
    if (!ffmpeg) {
      console.error('ffmpeg not found.');
      console.error('Install with: winget install --id Gyan.FFmpeg -e --accept-package-agreements');
      process.exit(1);
    }
    try {
      execFileSync(ffmpeg, ['-version'], { stdio: ['ignore', 'pipe', 'ignore'] });
    } catch {
      console.error(`ffmpeg is not runnable: ${ffmpeg}`);
      process.exit(1);
    }
    await runConvert(options, ffmpeg);
  }

  if (doStrapi) {
    if (!fs.existsSync(options.output)) {
      console.error(`Web output folder missing: ${options.output}`);
      console.error('Run conversion first, or pass --output');
      process.exit(1);
    }
    const syncStats = await syncStrapi(options.output, options);
    console.log('\nStrapi summary');
    console.log(`  uploaded:  ${syncStats.uploaded}`);
    console.log(`  linked:    ${syncStats.linked}`);
    console.log(`  skipped:   ${syncStats.skipped}`);
    console.log(`  unmatched: ${syncStats.unmatched}`);
    if (syncStats.errors) console.log(`  errors:    ${syncStats.errors}`);
  }
}

main().catch((error) => {
  console.error('\nFatal:', error.message || error);
  process.exit(1);
});
