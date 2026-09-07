#!/usr/bin/env node
/**
 * Fail the static build if any baked HTML/JS still points at localhost Strapi.
 * Media must be same-origin `/uploads/...` for Netlify.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const outDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../out");
const LOCALHOST = /https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i;
const TEXT_EXT = new Set([".html", ".txt", ".js", ".css", ".json"]);

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) yield* walk(full);
    else yield full;
  }
}

const hits = [];
for (const file of walk(outDir)) {
  if (!TEXT_EXT.has(path.extname(file))) continue;
  const text = readFileSync(file, "utf8");
  if (LOCALHOST.test(text)) {
    hits.push(path.relative(outDir, file));
  }
}

if (hits.length) {
  console.error(
    `Static export still contains localhost URLs (${hits.length} file(s)).`,
  );
  console.error(
    "Media must use relative /uploads/... paths for Netlify. Use: npm run build:static",
  );
  console.error("Examples:", hits.slice(0, 8).join(", "));
  process.exit(1);
}

console.log("OK: no localhost URLs in out/");
