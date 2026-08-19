"use client";

import { useMemo, useState } from "react";
import { ProjectGridCard } from "@/components/ProjectGridCard";
import { useHoverAudio } from "@/hooks/useHoverAudio";
import type { Category, Tag } from "@/lib/types";
import type { ProjectCard } from "@/lib/embed";
import styles from "./ProjectFilters.module.css";

type Props = {
  projects: ProjectCard[];
  categories: Category[];
  tags: Tag[];
};

export function ProjectFilters({ projects, categories, tags }: Props) {
  const [categorySlug, setCategorySlug] = useState<string | null>(null);
  const [tagSlug, setTagSlug] = useState<string | null>(null);
  const { play, stop, getCardStatus } = useHoverAudio();

  const usedTagSlugs = useMemo(() => {
    const set = new Set<string>();
    for (const project of projects) {
      for (const tag of project.tags || []) {
        if (tag.slug) set.add(tag.slug);
      }
    }
    return set;
  }, [projects]);

  const visibleTags = useMemo(
    () => tags.filter((tag) => usedTagSlugs.has(tag.slug)),
    [tags, usedTagSlugs],
  );

  const filtered = useMemo(() => {
    return projects.filter((project) => {
      if (categorySlug && project.category?.slug !== categorySlug) return false;
      if (tagSlug && !(project.tags || []).some((t) => t.slug === tagSlug)) {
        return false;
      }
      return true;
    });
  }, [projects, categorySlug, tagSlug]);

  return (
    <div className={styles.wrap}>
      <div className={styles.filters} role="group" aria-label="Filter by category">
        <button
          type="button"
          className={!categorySlug ? styles.chipActive : styles.chip}
          onClick={() => setCategorySlug(null)}
        >
          All
        </button>
        {categories.map((category) => (
          <button
            key={category.documentId}
            type="button"
            className={
              categorySlug === category.slug ? styles.chipActive : styles.chip
            }
            onClick={() =>
              setCategorySlug((current) =>
                current === category.slug ? null : category.slug,
              )
            }
          >
            {category.name}
          </button>
        ))}
      </div>

      {visibleTags.length > 0 ? (
        <div className={styles.filters} role="group" aria-label="Filter by tag">
          {visibleTags.map((tag) => (
            <button
              key={tag.documentId}
              type="button"
              className={tagSlug === tag.slug ? styles.chipActive : styles.chip}
              onClick={() =>
                setTagSlug((current) => (current === tag.slug ? null : tag.slug))
              }
            >
              {tag.name}
            </button>
          ))}
        </div>
      ) : null}

      <ul className={styles.grid}>
        {filtered.map((project, index) => (
          <ProjectGridCard
            key={project.documentId}
            project={project}
            index={index}
            audioStatus={getCardStatus(project.documentId)}
            onHoverStart={() => {
              if (project.audioUrl) play(project.documentId, project.audioUrl);
            }}
            onHoverEnd={() => stop()}
          />
        ))}
      </ul>

      {filtered.length === 0 ? (
        <p className={styles.empty}>No projects match these filters.</p>
      ) : null}
    </div>
  );
}
