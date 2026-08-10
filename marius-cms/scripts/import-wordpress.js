/**
 * One-shot WordPress → Strapi import.
 * Usage (from marius-cms, with develop stopped):
 *   node scripts/import-wordpress.js
 *
 * Steps:
 * 1) parse XML into scripts/parsed-projects.json (auto-run if missing)
 * 2) upload local media files
 * 3) create Project entries linked to categories + media
 */

const fs = require('fs');
const path = require('path');
const { createStrapi } = require('@strapi/strapi');
const { execFileSync } = require('child_process');

const APP_DIR = path.resolve(__dirname, '..');
const WORKSPACE = path.resolve(APP_DIR, '..');
const PARSED_PATH = path.join(__dirname, 'parsed-projects.json');
const MEDIA_DIR = path.join(
  WORKSPACE,
  'Web_Marius_Original',
  'media-export-189650785-from-0-to-556'
);

const MIME = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
};

function slugify(input) {
  return String(input)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 200);
}

function ensureParsed() {
  if (!fs.existsSync(PARSED_PATH)) {
    console.log('Parsing WordPress XML…');
    execFileSync(process.execPath, [path.join(__dirname, 'parse-wordpress-projects.js')], {
      stdio: 'inherit',
    });
  }
  return JSON.parse(fs.readFileSync(PARSED_PATH, 'utf8'));
}

function indexLocalFiles(dir) {
  const map = new Map();
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else map.set(entry.name.toLowerCase(), full);
    }
  };
  walk(dir);
  return map;
}

async function uploadFile(strapi, filePath, uploadedByName) {
  const stats = fs.statSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const mimetype = MIME[ext] || 'application/octet-stream';
  const originalFilename = path.basename(filePath);

  const existing = await strapi.db.query('plugin::upload.file').findOne({
    where: { name: originalFilename },
  });
  if (existing) return existing;

  const uploaded = await strapi.plugin('upload').service('upload').upload({
    data: {
      fileInfo: {
        name: originalFilename,
        alternativeText: uploadedByName || originalFilename,
        caption: originalFilename,
      },
    },
    files: {
      filepath: filePath,
      originalFilename,
      mimetype,
      size: stats.size,
    },
  });

  return Array.isArray(uploaded) ? uploaded[0] : uploaded;
}

async function getCategoryMap(strapi) {
  const categories = await strapi.db.query('api::category.category').findMany({});
  const map = new Map();
  for (const category of categories) {
    map.set(category.slug, category);
  }
  return map;
}

async function importProjects(strapi, parsed) {
  const categories = await getCategoryMap(strapi);
  const localFiles = indexLocalFiles(MEDIA_DIR);
  const mediaCache = new Map();

  const uploadCached = async (filePath, label) => {
    if (!filePath) return null;
    const key = path.resolve(filePath).toLowerCase();
    if (mediaCache.has(key)) return mediaCache.get(key);
    const file = await uploadFile(strapi, filePath, label);
    mediaCache.set(key, file);
    return file;
  };

  let created = 0;
  let skipped = 0;
  let mediaUploaded = 0;

  for (const project of parsed.projects) {
    const slug = slugify(project.title);
    const existing = await strapi.db.query('api::project.project').findOne({
      where: { slug },
    });
    if (existing) {
      skipped += 1;
      continue;
    }

    const category = categories.get(project.categorySlug);
    if (!category) {
      console.warn(`Missing category ${project.categorySlug} for ${project.title}`);
      continue;
    }

    const galleryIds = [];
    const audioIds = [];

    for (const basename of project.imageBasenames || []) {
      const localPath = localFiles.get(basename);
      if (!localPath) continue;
      const before = mediaCache.size;
      const file = await uploadCached(localPath, project.title);
      if (file) {
        if (mediaCache.size > before) mediaUploaded += 1;
        galleryIds.push(file.id);
      }
    }

    for (const basename of project.audioBasenames || []) {
      const localPath = localFiles.get(basename);
      if (!localPath) continue;
      const before = mediaCache.size;
      const file = await uploadCached(localPath, project.title);
      if (file) {
        if (mediaCache.size > before) mediaUploaded += 1;
        audioIds.push(file.id);
      }
    }

    // Also upload any local paths already resolved by the parser
    for (const localPath of project.localImages || []) {
      const before = mediaCache.size;
      const file = await uploadCached(localPath, project.title);
      if (file) {
        if (mediaCache.size > before) mediaUploaded += 1;
        if (!galleryIds.includes(file.id)) galleryIds.push(file.id);
      }
    }
    for (const localPath of project.localAudio || []) {
      const before = mediaCache.size;
      const file = await uploadCached(localPath, project.title);
      if (file) {
        if (mediaCache.size > before) mediaUploaded += 1;
        if (!audioIds.includes(file.id)) audioIds.push(file.id);
      }
    }

    const coverImage = galleryIds[0] || null;

    await strapi.documents('api::project.project').create({
      data: {
        title: project.title,
        slug,
        role: project.role,
        venue: project.venue,
        collaborators: project.collaborators,
        year: project.year,
        summary: project.summary,
        embedUrl: project.embedUrl,
        externalLinks: project.externalLinks || [],
        sortOrder: project.sortOrder,
        wordpressSourceUrl: project.wordpressSourceUrl,
        category: category.documentId,
        coverImage: coverImage || undefined,
        gallery: galleryIds.length ? galleryIds : undefined,
        audioFiles: audioIds.length ? audioIds : undefined,
      },
      status: 'published',
    });

    created += 1;
    console.log(
      `✓ ${project.categorySlug} / ${project.title} (images=${galleryIds.length}, audio=${audioIds.length})`
    );
  }

  // Optional: upload leftover media not referenced by parsed projects
  let orphansUploaded = 0;
  if (process.argv.includes('--all-media')) {
    for (const [, filePath] of localFiles.entries()) {
      const key = path.resolve(filePath).toLowerCase();
      if (mediaCache.has(key)) continue;
      await uploadCached(filePath, 'wordpress-orphan');
      orphansUploaded += 1;
    }
  }

  return { created, skipped, mediaUploaded, orphansUploaded, mediaTotal: mediaCache.size };
}

async function main() {
  const parsed = ensureParsed();
  console.log(`Importing ${parsed.projectCount} projects…`);

  process.chdir(APP_DIR);
  const app = await createStrapi({ distDir: './dist' }).load();

  try {
    const result = await importProjects(app, parsed);
    console.log('\nImport complete:');
    console.log(result);
  } finally {
    await app.destroy();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
