import type { Project } from "./types";
import { mediaUrl, projectMainImage } from "./media";

/** Clean WP-exported junk like `\u0026amp;` and leading spaces. */
export function cleanUrl(raw?: string | null): string | null {
  if (!raw) return null;
  let url = raw.trim();
  url = url
    .replace(/\\u0026amp;/gi, "&")
    .replace(/\\u0026/gi, "&")
    .replace(/&amp;/gi, "&");
  try {
    return new URL(url).toString();
  } catch {
    return null;
  }
}

export function youtubeId(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      return u.pathname.split("/").filter(Boolean)[0] || null;
    }
    if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
      if (u.pathname.startsWith("/shorts/")) {
        return u.pathname.split("/")[2] || null;
      }
      if (u.pathname.startsWith("/embed/")) {
        return u.pathname.split("/")[2] || null;
      }
      if (u.pathname.startsWith("/live/")) {
        return u.pathname.split("/")[2] || null;
      }
      return u.searchParams.get("v");
    }
  } catch {
    return null;
  }
  return null;
}

export function vimeoId(url: string): string | null {
  try {
    const u = new URL(url);
    if (!u.hostname.includes("vimeo.com")) return null;
    const part = u.pathname.split("/").filter(Boolean)[0];
    return part && /^\d+$/.test(part) ? part : null;
  } catch {
    return null;
  }
}

export function youtubeThumbnail(url: string): string | null {
  const id = youtubeId(url);
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
}

export function toEmbedSrc(raw?: string | null): string | null {
  const url = cleanUrl(raw);
  if (!url) return null;

  const yt = youtubeId(url);
  if (yt) return `https://www.youtube.com/embed/${yt}`;

  const vimeo = vimeoId(url);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo}`;

  if (/open\.spotify\.com\//i.test(url)) {
    return url.replace("open.spotify.com/", "open.spotify.com/embed/");
  }

  if (/soundcloud\.com\//i.test(url)) {
    return `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23141414&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false`;
  }

  return null;
}

async function oembedThumbnail(url: string): Promise<string | null> {
  const endpoints = [
    `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`,
    `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`,
    `https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(url)}`,
    `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`,
  ];

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, { cache: "force-cache" });
      if (!res.ok) continue;
      const data = (await res.json()) as { thumbnail_url?: string };
      if (data.thumbnail_url) return data.thumbnail_url;
    } catch {
      // try next provider
    }
  }
  return null;
}

function candidateUrls(project: Project): string[] {
  const urls = [
    project.embedUrl,
    ...(project.externalLinks || []).map((link) => link.url),
  ];
  return urls
    .map((url) => cleanUrl(url))
    .filter((url): url is string => Boolean(url));
}

/** Local media first, then YouTube/Spotify/Vimeo/SoundCloud thumbnails. */
export async function resolveProjectPreviewUrl(
  project: Project,
): Promise<string | null> {
  const media = projectMainImage(project);
  const fromMedia =
    mediaUrl(media, "medium") ||
    mediaUrl(media, "small") ||
    mediaUrl(media, "thumbnail") ||
    mediaUrl(media);
  if (fromMedia) return fromMedia;

  for (const url of candidateUrls(project)) {
    const yt = youtubeThumbnail(url);
    if (yt) return yt;

    const remote = await oembedThumbnail(url);
    if (remote) return remote;
  }

  return null;
}

export type ProjectCard = Project & {
  previewUrl: string | null;
};

export async function withPreviewUrls(
  projects: Project[],
): Promise<ProjectCard[]> {
  return Promise.all(
    projects.map(async (project) => ({
      ...project,
      previewUrl: await resolveProjectPreviewUrl(project),
    })),
  );
}
