# Marius portfolio content model

Adapted from the [Strapi travel-blog guide](https://strapi.io/blog/start-travel-blog-headless-cms-guide) for an artist portfolio instead of destinations/trip journals.

## Mapping (guide → this project)

| Travel guide | Marius CMS | Purpose |
|---|---|---|
| Post | **Project** | One work entry (show, release, campaign) |
| Destination | **Category** | Performing arts / Music / Motion graphics |
| Tag | **Tag** | Role & format labels across categories |
| PhotoGallery | Project `gallery` + `audioFiles` | Media lives on the project |
| (n/a) | **Page** | About, Contact |
| (n/a) | **Site Setting** | Brand, bio, contact (email/phone), socials |

## Categories (primary nav)

From WordPress pages + `migration_projects.csv`:

1. **Performing arts** (`performing-arts`) — homepage `/` — 26 projects
2. **Music** (`music`) — `/music/` — 8 projects
3. **Motion graphics** (`motion-graphics`) — `/motion-graphics/` — 8 projects

Standalone pages (not categories): **About**, **Contact**.

## Project fields

Typical WP entry looks like:

```
Title
Role / short description
Venue or production company
Collaborators / directors
Year
[images | audio | Spotify/YouTube embed | external link]
```

Stored as: `title`, `role`, `venue`, `collaborators`, `year`, `summary`, `coverImage`, `gallery`, `audioFiles`, `embedUrl`, `externalLinks`, related `category` + `tags`.

## Suggested tags

Composer, Sound designer, Artistic stage engineer, Light design, Mix & master, Remix, Album, Music video, Campaign, Documentary, Game, Internship.

## Source assets

- XML: `Web_Marius_Original/mariusvarhaugvik.WordPress.2026-08-10_All_Original.xml`
- Media: `Web_Marius_Original/media-export-189650785-from-0-to-556/` (~134 files by year)
- Inventory: `Web_Marius_Migration_ChatGPT_Proposal/CSV/` and `migracion_matriz_completa.xlsx`

## API examples (after `npm run develop`)

```
GET /api/categories?populate=*
GET /api/projects?filters[category][slug][$eq]=performing-arts&populate=*&sort=sortOrder:asc
GET /api/projects?filters[category][slug][$eq]=music&populate=*
GET /api/site-setting?populate=*
GET /api/pages?filters[slug][$eq]=about
```

## Next migration steps

1. Create admin user on first boot at `http://localhost:1337/admin`
2. Import media from the export folder into Strapi Media Library
3. Create Project entries from CSV (or a seed script), linking media + category
4. Build frontend template later against these endpoints
