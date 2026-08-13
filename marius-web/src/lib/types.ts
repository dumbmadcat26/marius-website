export type StrapiMediaFormat = {
  url: string;
  width?: number | null;
  height?: number | null;
};

export type StrapiMedia = {
  id: number;
  documentId?: string;
  url: string;
  alternativeText?: string | null;
  name?: string;
  mime?: string;
  ext?: string;
  width?: number | null;
  height?: number | null;
  formats?: {
    thumbnail?: StrapiMediaFormat;
    small?: StrapiMediaFormat;
    medium?: StrapiMediaFormat;
    large?: StrapiMediaFormat;
  } | null;
};

export type Category = {
  id: number;
  documentId: string;
  name: string;
  slug: string;
  description?: string | null;
  sortOrder?: number | null;
  isPrimaryNav?: boolean | null;
};

export type Tag = {
  id: number;
  documentId: string;
  name: string;
  slug: string;
  color?: string | null;
};

export type ExternalLink = {
  id?: number;
  label: string;
  url: string;
};

export type EducationItem = {
  id?: number;
  institution: string;
  program?: string | null;
  years?: string | null;
};

export type AwardItem = {
  id?: number;
  title: string;
  year?: string | null;
  organization?: string | null;
};

export type SocialLink = {
  id?: number;
  platform?: string | null;
  url: string;
  label?: string | null;
};

export type Project = {
  id: number;
  documentId: string;
  title: string;
  slug: string;
  role?: string | null;
  venue?: string | null;
  collaborators?: string | null;
  year?: number | null;
  summary?: string | null;
  body?: unknown;
  embedUrl?: string | null;
  sortOrder?: number | null;
  coverImage?: StrapiMedia | null;
  gallery?: StrapiMedia[] | null;
  audioFiles?: StrapiMedia[] | null;
  externalLinks?: ExternalLink[] | null;
  category?: Category | null;
  tags?: Tag[] | null;
};

export type SiteSetting = {
  id: number;
  documentId: string;
  siteName: string;
  tagline?: string | null;
  email?: string | null;
  phone?: string | null;
  bioIntro?: string | null;
  locationNote?: string | null;
  whatIDo?: string[] | null;
  portrait?: StrapiMedia | null;
  education?: EducationItem[] | null;
  awards?: AwardItem[] | null;
  socialLinks?: SocialLink[] | null;
  internships?: ExternalLink[] | null;
};
