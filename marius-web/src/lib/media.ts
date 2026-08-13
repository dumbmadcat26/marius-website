import type { Project, StrapiMedia } from "./types";

const DEFAULT_STRAPI_URL = "http://localhost:1337";

export function getStrapiUrl(): string {
  return (
    process.env.STRAPI_URL ||
    process.env.NEXT_PUBLIC_STRAPI_URL ||
    DEFAULT_STRAPI_URL
  ).replace(/\/$/, "");
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
