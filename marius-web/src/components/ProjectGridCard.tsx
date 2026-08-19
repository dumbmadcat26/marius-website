"use client";

import Link from "next/link";
import type { ProjectCard } from "@/lib/embed";
import styles from "./ProjectFilters.module.css";

export type AudioStatus = "idle" | "loading" | "playing";

type Props = {
  project: ProjectCard;
  index: number;
  audioStatus: AudioStatus;
  onHoverStart: () => void;
  onHoverEnd: () => void;
};

export function ProjectGridCard({
  project,
  index,
  audioStatus,
  onHoverStart,
  onHoverEnd,
}: Props) {
  const meta = [
    project.category?.name,
    project.year ? String(project.year) : null,
  ].filter(Boolean);

  const hasAudio = Boolean(project.audioUrl);
  const showIndicator = hasAudio && audioStatus !== "idle";

  return (
    <li
      className={styles.card}
      style={{ animationDelay: `${Math.min(index, 16) * 35}ms` }}
      onPointerEnter={hasAudio ? onHoverStart : undefined}
      onPointerLeave={hasAudio ? onHoverEnd : undefined}
    >
      <Link href={`/projects/${project.slug}/`} className={styles.cardLink}>
        <div className={styles.media}>
          {project.previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={project.previewUrl}
              alt=""
              loading="lazy"
              className={styles.image}
            />
          ) : (
            <span className={styles.fallback} aria-hidden>
              {project.title.slice(0, 1)}
            </span>
          )}

          {hasAudio ? (
            <span
              className={`${styles.audioBadge} ${showIndicator ? styles.audioBadgeActive : ""}`}
              aria-hidden
            >
              {showIndicator ? (
                audioStatus === "loading" ? (
                  <span className={styles.audioLoading} />
                ) : (
                  <span className={styles.audioBars}>
                    <span />
                    <span />
                    <span />
                  </span>
                )
              ) : (
                <span className={styles.audioIdleMark} />
              )}
            </span>
          ) : null}
        </div>
        <div className={styles.copy}>
          <h2 className={styles.title}>{project.title}</h2>
          {meta.length > 0 ? (
            <p className={styles.meta}>{meta.join(" · ")}</p>
          ) : null}
        </div>
      </Link>
    </li>
  );
}
