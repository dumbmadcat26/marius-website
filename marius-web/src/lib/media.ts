import type { Project, StrapiMedia } from "./types";

const DEFAULT_STRAPI_URL = "http://localhost:1337";

function isLocalhostUrl(url: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(url);
}

/** Strapi REST API base URL — used for server/build-time fetches only. */
export function getStrapiApiUrl(): string {
  const envUrl = process.env.STRAPI_URL;
  if (envUrl !== undefined) return envUrl.replace(/\/$/, "");
  return DEFAULT_STRAPI_URL;
}

/**
 * Public base for uploaded media.
 * Empty string = same-origin relative paths (`/uploads/...`) — required for
 * Netlify / static export so images & audio are served from the deployed site,
 * not from a machine-local Strapi.
 *
 * In production builds, localhost values from `.env.local` are ignored so a
 * fresh clone does not bake `http://localhost:1337` into the static HTML.
 */
export function getMediaBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_STRAPI_URL;
  if (envUrl !== undefined) {
    const base = envUrl.replace(/\/$/, "");
    if (process.env.NODE_ENV === "production" && isLocalhostUrl(base)) {
      return "";
    }
    return base;
  }
  if (process.env.NODE_ENV === "development") return DEFAULT_STRAPI_URL;
  return "";
}

/** @deprecated Use getStrapiApiUrl() or getMediaBaseUrl() */
export function getStrapiUrl(): string {
  return getStrapiApiUrl();
}

type MediaSize = "thumbnail" | "small" | "medium" | "large" | "original";

export function mediaUrl(
  media?: StrapiMedia | null,
  size: MediaSize = "original",
): string | null {
  if (!media?.url) return null;

  const relative =
    size !== "original" && media.formats?.[size]?.url
      ? media.formats[size]!.url
      : media.url;

  if (relative.startsWith("http://") || relative.startsWith("https://")) {
    return relative;
  }
  return `${getMediaBaseUrl()}${relative.startsWith("/") ? "" : "/"}${relative}`;
}

/** First WP image = cover, else first gallery item. */
export function projectMainImage(project: Project): StrapiMedia | null {
  return project.coverImage || project.gallery?.[0] || null;
}

export function isAudio(mime?: string | null, ext?: string | null): boolean {
  if (mime?.startsWith("audio/")) return true;
  return Boolean(
    ext && [".wav", ".mp3", ".m4a", ".aac", ".ogg"].includes(ext.toLowerCase()),
  );
}

/** First playable audio file on a project, if any. */
export function projectAudioUrl(project: Project): string | null {
  for (const file of project.audioFiles || []) {
    if (!isAudio(file.mime, file.ext)) continue;
    const url = mediaUrl(file);
    if (url) return url;
  }
  return null;
}
