import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ImageGallery } from "@/components/ImageGallery";
import { SiteHeader } from "@/components/SiteHeader";
import { toEmbedSrc } from "@/lib/embed";
import { isAudio, mediaUrl } from "@/lib/media";
import {
  blocksToPlainText,
  getProjectBySlug,
  getProjects,
  getSiteSetting,
} from "@/lib/strapi";
import styles from "./project.module.css";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const projects = await getProjects();
  return projects.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) return { title: "Project" };
  return {
    title: project.title,
    description: project.summary || project.role || undefined,
  };
}

function isImageMedia(
  mime?: string | null,
  ext?: string | null,
  url?: string | null,
) {
  if (mime?.startsWith("image/")) return true;
  if (mime && !mime.startsWith("image/")) return false;
  const haystack = `${ext || ""} ${url || ""}`.toLowerCase();
  return /\.(jpe?g|png|webp|gif|avif)(\?|$)/i.test(haystack);
}

export default async function ProjectPage({ params }: Props) {
  const { slug } = await params;
  const [site, project] = await Promise.all([
    getSiteSetting(),
    getProjectBySlug(slug),
  ]);

  if (!project) notFound();

  const bodyParagraphs = blocksToPlainText(project.body);
  const galleryItems = (project.gallery || []).filter((item) => {
    const url = mediaUrl(item);
    return Boolean(url && isImageMedia(item.mime, item.ext, url));
  });
  const coverUrl = mediaUrl(project.coverImage);
  const galleryImages =
    galleryItems.length > 0
      ? galleryItems.map((image) => ({
          src: mediaUrl(image)!,
          alt: image.alternativeText || project.title,
        }))
      : coverUrl
        ? [
            {
              src: coverUrl,
              alt: project.coverImage?.alternativeText || project.title,
            },
          ]
        : [];

  const audioFiles = (project.audioFiles || []).filter((item) => mediaUrl(item));
  const embedSrc = toEmbedSrc(project.embedUrl);
  const metaBits = [
    project.role,
    project.venue,
    project.year ? String(project.year) : null,
    project.category?.name,
  ].filter(Boolean);

  return (
    <main className="shell">
      <SiteHeader
        siteName={site?.siteName || "Marius Varhaugvik"}
        tagline={site?.tagline}
        active="work"
      />

      <article className={styles.article}>
        <Link href="/" className={styles.back}>
          ← Work
        </Link>

        <header className={styles.header}>
          <h1 className={styles.title}>{project.title}</h1>
          {metaBits.length > 0 ? (
            <p className={styles.meta}>{metaBits.join(" · ")}</p>
          ) : null}
          {project.collaborators ? (
            <p className={styles.meta}>{project.collaborators}</p>
          ) : null}
          {(project.tags || []).length > 0 ? (
            <p className={styles.tags}>
              {(project.tags || []).map((tag) => tag.name).join(" · ")}
            </p>
          ) : null}
        </header>

        {galleryImages.length > 0 ? (
          <ImageGallery images={galleryImages} />
        ) : null}

        {project.summary ? (
          <p className={styles.summary}>{project.summary}</p>
        ) : null}

        {bodyParagraphs.length > 0 ? (
          <div className={styles.body}>
            {bodyParagraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        ) : null}

        {embedSrc ? (
          <div
            className={
              /spotify|soundcloud/i.test(embedSrc)
                ? styles.embedWrapAudio
                : styles.embedWrap
            }
          >
            <iframe
              className={styles.embed}
              src={embedSrc}
              title={`${project.title} embed`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              loading="lazy"
            />
          </div>
        ) : null}

        {audioFiles.length > 0 ? (
          <section className={styles.section}>
            <h2>Audio</h2>
            <ul className={styles.audioList}>
              {audioFiles.map((file) => {
                const url = mediaUrl(file)!;
                return (
                  <li key={file.id || url}>
                    <p className={styles.audioName}>{file.name || "Audio"}</p>
                    {isAudio(file.mime, file.ext) ? (
                      <audio controls preload="none" src={url}>
                        <a href={url}>Download audio</a>
                      </audio>
                    ) : (
                      <a href={url}>Download file</a>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        {(project.externalLinks || []).length > 0 ? (
          <section className={styles.section}>
            <h2>Links</h2>
            <ul className={styles.links}>
              {(project.externalLinks || []).map((link) => (
                <li key={`${link.label}-${link.url}`}>
                  <a href={link.url} target="_blank" rel="noreferrer">
                    {link.label || link.url}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </article>
    </main>
  );
}
