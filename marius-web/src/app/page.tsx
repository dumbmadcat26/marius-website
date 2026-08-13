import { SiteHeader } from "@/components/SiteHeader";
import { ProjectFilters } from "@/components/ProjectFilters";
import { withPreviewUrls } from "@/lib/embed";
import { getCategories, getProjects, getSiteSetting, getTags } from "@/lib/strapi";

export default async function HomePage() {
  const [site, projects, categories, tags] = await Promise.all([
    getSiteSetting(),
    getProjects(),
    getCategories(),
    getTags(),
  ]);

  const cards = await withPreviewUrls(projects);

  return (
    <main className="shell">
      <SiteHeader
        siteName={site?.siteName || "Marius Varhaugvik"}
        tagline={site?.tagline}
        active="work"
      />
      <ProjectFilters
        projects={cards}
        categories={categories}
        tags={tags}
      />
    </main>
  );
}
