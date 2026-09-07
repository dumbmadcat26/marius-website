import type { Category, Project, SiteSetting, Tag } from "./types";
import { getStrapiApiUrl } from "./media";

export {
  getMediaBaseUrl,
  getStrapiApiUrl,
  getStrapiUrl,
  mediaUrl,
  projectMainImage,
} from "./media";

type StrapiListResponse<T> = {
  data: T[];
  meta?: {
    pagination?: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
};

type StrapiSingleResponse<T> = {
  data: T | null;
};

async function strapiFetch<T>(path: string): Promise<T> {
  const url = `${getStrapiApiUrl()}${path.startsWith("/") ? "" : "/"}${path}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    // Fresh data in `next dev`; cacheable fetches for static `next build` export.
    cache: process.env.NODE_ENV === "development" ? "no-store" : "force-cache",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Strapi ${res.status} ${url}${body ? `: ${body.slice(0, 200)}` : ""}`);
  }

  return res.json() as Promise<T>;
}

async function fetchAllPages<T>(pathWithQuery: string): Promise<T[]> {
  const pageSize = 100;
  let page = 1;
  let pageCount = 1;
  const items: T[] = [];

  while (page <= pageCount) {
    const separator = pathWithQuery.includes("?") ? "&" : "?";
    const json = await strapiFetch<StrapiListResponse<T>>(
      `${pathWithQuery}${separator}pagination[page]=${page}&pagination[pageSize]=${pageSize}`,
    );
    items.push(...(json.data || []));
    pageCount = json.meta?.pagination?.pageCount || 1;
    page += 1;
  }

  return items;
}

const PROJECT_POPULATE =
  "populate[category]=true&populate[tags]=true&populate[coverImage]=true&populate[gallery]=true&populate[audioFiles]=true&populate[externalLinks]=true";

export async function getSiteSetting(): Promise<SiteSetting | null> {
  const json = await strapiFetch<StrapiSingleResponse<SiteSetting>>(
    "/api/site-setting?populate[portrait]=true&populate[education]=true&populate[awards]=true&populate[socialLinks]=true&populate[internships]=true",
  );
  return json.data;
}

export async function getCategories(): Promise<Category[]> {
  return fetchAllPages<Category>(
    "/api/categories?sort=sortOrder:asc&filters[isPrimaryNav][$eq]=true",
  );
}

export async function getTags(): Promise<Tag[]> {
  return fetchAllPages<Tag>("/api/tags?sort=name:asc");
}

export async function getProjects(): Promise<Project[]> {
  const projects = await fetchAllPages<Project>(
    `/api/projects?${PROJECT_POPULATE}&sort[0]=year:desc&sort[1]=sortOrder:asc&sort[2]=title:asc`,
  );
  return projects;
}

export async function getProjectBySlug(slug: string): Promise<Project | null> {
  const json = await strapiFetch<StrapiListResponse<Project>>(
    `/api/projects?filters[slug][$eq]=${encodeURIComponent(slug)}&${PROJECT_POPULATE}&pagination[pageSize]=1`,
  );
  return json.data?.[0] || null;
}

/** Flatten Strapi Blocks into plain paragraphs for simple rendering. */
export function blocksToPlainText(blocks: unknown): string[] {
  if (!Array.isArray(blocks)) return [];

  const paragraphs: string[] = [];

  for (const block of blocks) {
    if (!block || typeof block !== "object") continue;
    const b = block as { type?: string; children?: Array<{ text?: string }> };
    if (b.type === "paragraph" || b.type === "heading") {
      const text = (b.children || [])
        .map((c) => c.text || "")
        .join("")
        .trim();
      if (text) paragraphs.push(text);
    }
  }

  return paragraphs;
}
