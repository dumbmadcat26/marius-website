import type { Project, StrapiMedia } from "./types";

const DEFAULT_STRAPI_URL = "http://localhost:1337";

export function getStrapiUrl(): string {
  const envUrl =
    process.env.STRAPI_URL ?? process.env.NEXT_PUBLIC_STRAPI_URL;
  if (envUrl !== undefined) return envUrl.replace(/\/$/, "");
  return DEFAULT_STRAPI_URL;
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
  return `${getStrapiUrl()}${relative.startsWith("/") ? "" : "/"}${relative}`;
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
