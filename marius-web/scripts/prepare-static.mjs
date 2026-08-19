#!/usr/bin/env node
/**
 * Copy Strapi uploads into Next public/ so static export serves media locally.
 * Run from marius-web/ before `npm run build`.
 */
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const uploadsSrc = path.resolve(root, "../marius-cms/public/uploads");
const uploadsDest = path.resolve(root, "public/uploads");

if (!existsSync(uploadsSrc)) {
  console.error(`Missing uploads folder: ${uploadsSrc}`);
  console.error("Run `git lfs pull` in the repo root, then retry.");
  process.exit(1);
}

mkdirSync(path.resolve(root, "public"), { recursive: true });
rmSync(uploadsDest, { recursive: true, force: true });
cpSync(uploadsSrc, uploadsDest, { recursive: true });

console.log(`Copied uploads → public/uploads (${uploadsDest})`);
