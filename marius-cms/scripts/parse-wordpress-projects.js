const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const XML_PATH = path.join(
  ROOT,
  'Web_Marius_Original',
  'mariusvarhaugvik.WordPress.2026-08-10_All_Original.xml'
);
const MEDIA_DIR = path.join(
  ROOT,
  'Web_Marius_Original',
  'media-export-189650785-from-0-to-556'
);
const OUT_PATH = path.join(__dirname, 'parsed-projects.json');

const PAGE_CATEGORY = {
  'Performing arts': {
    slug: 'performing-arts',
    sourceUrl: 'https://mariusvarhaugvik.com/',
  },
  Music: {
    slug: 'music',
    sourceUrl: 'https://mariusvarhaugvik.com/music/',
  },
  'Motion graphics': {
    slug: 'motion-graphics',
    sourceUrl: 'https://mariusvarhaugvik.com/motion-graphics/',
  },
};

function decodeEntities(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8211;/g, '–')
    .replace(/&#8212;/g, '—')
    .replace(/&nbsp;/g, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?[^>]+>/g, '')
    .replace(/\s+\n/g, '\n')
    .trim();
}

function extractPageContent(xml, title) {
  const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(
    `<title><!\\[CDATA\\[${escaped}\\]\\]><\\/title>[\\s\\S]*?<content:encoded><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/content:encoded>`
  );
  const match = xml.match(re);
  return match ? match[1] : null;
}

function basenameFromUrl(url) {
  try {
    const clean = url.split('?')[0];
    return decodeURIComponent(path.posix.basename(clean)).toLowerCase();
  } catch {
    return null;
  }
}

function indexLocalMedia(dir) {
  const map = new Map();
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else {
        const key = entry.name.toLowerCase();
        if (!map.has(key)) map.set(key, full);
      }
    }
  };
  walk(dir);
  return map;
}

function parseProjectsFromHtml(html, categoryMeta) {
  const parts = html.split(/<h2\b[^>]*>/i).slice(1);
  const projects = [];

  parts.forEach((part, index) => {
    const titleMatch = part.match(/^([\s\S]*?)<\/h2>/i);
    if (!titleMatch) return;

    const title = decodeEntities(titleMatch[1]);
    if (!title || title.toLowerCase() === 'dela detta:') return;

    const body = part.slice(titleMatch[0].length);
    const paragraphMatch = body.match(/<p\b[^>]*>([\s\S]*?)<\/p>/i);
    const lines = paragraphMatch
      ? decodeEntities(paragraphMatch[1])
          .split(/\n+/)
          .map((l) => l.trim())
          .filter(Boolean)
      : [];

    let year = null;
    const remaining = [...lines];
    if (remaining.length) {
      const last = remaining[remaining.length - 1];
      if (/^\d{4}$/.test(last)) {
        year = Number(last);
        remaining.pop();
      }
    }

    const role = remaining[0] || null;
    const venue = remaining[1] || null;
    const collaborators = remaining.slice(2).join(' | ') || null;
    const summary = lines.join('\n') || null;

    const imageUrls = [...body.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["']/gi)].map(
      (m) => m[1]
    );
    const audioUrls = [
      ...body.matchAll(/<audio\b[^>]*\bsrc=["']([^"']+)["']/gi),
      ...body.matchAll(/<source\b[^>]*\bsrc=["']([^"']+)["']/gi),
    ].map((m) => m[1]);

    const embedUrls = [];
    for (const m of body.matchAll(
      /(?:wp:embed\s*\{[^}]*"url"\s*:\s*"([^"]+)"|<div class="wp-block-embed__wrapper">\s*(https?:\/\/[^\s<]+))/gi
    )) {
      embedUrls.push(m[1] || m[2]);
    }

    const externalLinks = [];
    for (const m of body.matchAll(/<a\b[^>]*\bhref=["'](https?:\/\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
      const href = m[1];
      if (/wp-content\/uploads|wordpress\.com\/wp-content/i.test(href)) continue;
      if (/mariusvarhaugvik\.com\/(?:marius-varhaugvik|music|motion-graphics|about)\//i.test(href)) {
        continue;
      }
      const label = decodeEntities(m[2]) || href;
      if (!externalLinks.some((l) => l.url === href)) {
        externalLinks.push({ label, url: href });
      }
    }

    projects.push({
      title,
      categorySlug: categoryMeta.slug,
      wordpressSourceUrl: categoryMeta.sourceUrl,
      sortOrder: index + 1,
      role,
      venue,
      collaborators,
      year,
      summary,
      imageBasenames: [...new Set(imageUrls.map(basenameFromUrl).filter(Boolean))],
      audioBasenames: [...new Set(audioUrls.map(basenameFromUrl).filter(Boolean))],
      embedUrl: embedUrls[0] || null,
      externalLinks,
    });
  });

  return projects;
}

function main() {
  const xml = fs.readFileSync(XML_PATH, 'utf8');
  const mediaIndex = indexLocalMedia(MEDIA_DIR);
  const allProjects = [];

  for (const [pageTitle, meta] of Object.entries(PAGE_CATEGORY)) {
    const html = extractPageContent(xml, pageTitle);
    if (!html) {
      console.error(`Missing page content: ${pageTitle}`);
      continue;
    }
    const projects = parseProjectsFromHtml(html, meta);
    for (const project of projects) {
      project.localImages = project.imageBasenames
        .map((name) => mediaIndex.get(name) || null)
        .filter(Boolean);
      project.localAudio = project.audioBasenames
        .map((name) => mediaIndex.get(name) || null)
        .filter(Boolean);
      project.missingMedia = [
        ...project.imageBasenames.filter((n) => !mediaIndex.has(n)),
        ...project.audioBasenames.filter((n) => !mediaIndex.has(n)),
      ];
      allProjects.push(project);
    }
    console.log(`${pageTitle}: ${projects.length} projects`);
  }

  const orphanMedia = [...mediaIndex.keys()].filter((name) => {
    return !allProjects.some(
      (p) => p.imageBasenames.includes(name) || p.audioBasenames.includes(name)
    );
  });

  const payload = {
    generatedAt: new Date().toISOString(),
    projectCount: allProjects.length,
    localMediaCount: mediaIndex.size,
    orphanMediaCount: orphanMedia.length,
    orphanMedia: orphanMedia.slice(0, 50),
    projects: allProjects,
  };

  fs.writeFileSync(OUT_PATH, JSON.stringify(payload, null, 2));
  console.log(`Wrote ${OUT_PATH}`);
  console.log(
    `Projects with missing media: ${allProjects.filter((p) => p.missingMedia.length).length}`
  );
}

main();
