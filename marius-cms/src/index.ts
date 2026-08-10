import type { Core } from '@strapi/strapi';

const CATEGORIES = [
  {
    name: 'Performing arts',
    slug: 'performing-arts',
    description: 'Theatre, dance, and live performance composition & sound design.',
    sortOrder: 1,
  },
  {
    name: 'Music',
    slug: 'music',
    description: 'Releases, remixes, music videos, and related music work.',
    sortOrder: 2,
  },
  {
    name: 'Motion graphics',
    slug: 'motion-graphics',
    description: 'Composition and sound design for film, trailers, campaigns, and games.',
    sortOrder: 3,
  },
];

const TAGS = [
  { name: 'Composer', slug: 'composer', color: '#1a1a1a' },
  { name: 'Sound designer', slug: 'sound-designer', color: '#333333' },
  { name: 'Artistic stage engineer', slug: 'artistic-stage-engineer', color: '#4a4a4a' },
  { name: 'Light design', slug: 'light-design', color: '#666666' },
  { name: 'Mix & master', slug: 'mix-master', color: '#808080' },
  { name: 'Remix', slug: 'remix', color: '#2c5282' },
  { name: 'Album', slug: 'album', color: '#2b6cb0' },
  { name: 'Music video', slug: 'music-video', color: '#3182ce' },
  { name: 'Campaign', slug: 'campaign', color: '#744210' },
  { name: 'Documentary', slug: 'documentary', color: '#975a16' },
  { name: 'Game', slug: 'game', color: '#276749' },
  { name: 'Internship', slug: 'internship', color: '#553c9a' },
];

async function seedCategories(strapi: Core.Strapi) {
  for (const category of CATEGORIES) {
    const existing = await strapi.db.query('api::category.category').findOne({
      where: { slug: category.slug },
    });

    if (!existing) {
      await strapi.documents('api::category.category').create({
        data: {
          ...category,
          isPrimaryNav: true,
        },
        status: 'published',
      });
      strapi.log.info(`Seeded category: ${category.name}`);
    }
  }
}

async function seedTags(strapi: Core.Strapi) {
  for (const tag of TAGS) {
    const existing = await strapi.db.query('api::tag.tag').findOne({
      where: { slug: tag.slug },
    });

    if (!existing) {
      await strapi.documents('api::tag.tag').create({
        data: tag,
      });
      strapi.log.info(`Seeded tag: ${tag.name}`);
    }
  }
}

async function seedSiteSetting(strapi: Core.Strapi) {
  const existing = await strapi.db.query('api::site-setting.site-setting').findOne({});

  if (!existing) {
    await strapi.documents('api::site-setting.site-setting').create({
      data: {
        siteName: 'Marius Varhaugvik',
        tagline: 'composer, sound designer & artistic stage engineer',
        bioIntro: 'Sound designer, composer & artistic stage engineer',
        locationNote: 'From Stockholm, Sweden. Lived in Berlin, Germany & Molde, Norway',
        whatIDo: [
          'Composer',
          'Artistic stage engineer',
          'Mix & master',
          'Sound designer',
          'Sound technician',
          'Light design',
        ],
        education: [
          {
            institution: 'Stockholm University of the Arts',
            program: 'Sound Design',
            years: '2021-2024',
          },
          {
            institution: 'Uppsala University',
            program: 'Musiklivets organisation och strukturer',
            years: '2016',
          },
        ],
        awards: [
          {
            title: 'Årets politiska',
            year: '2017',
            organization: 'Scenkonstgalan',
          },
          {
            title: 'Festival hero award',
            year: '2025',
            organization: 'Fringe festival',
          },
          {
            title: 'Out of body experience',
            year: '2025',
            organization: 'Fringe festival',
          },
        ],
        socialLinks: [
          { platform: 'instagram', url: 'https://www.instagram.com/', label: 'Instagram' },
          { platform: 'linkedin', url: 'https://www.linkedin.com/', label: 'LinkedIn' },
          { platform: 'youtube', url: 'https://www.youtube.com/', label: 'YouTube' },
          { platform: 'facebook', url: 'https://www.facebook.com/', label: 'Facebook' },
        ],
        internships: [
          { label: 'Ambiens, 2021', url: 'https://ambiens.studio/' },
          {
            label: 'KonstAB, 2023',
            url: 'https://www.dramaten.se/repertoar/konstabs-ingmar-bergmans-sasom-i-en-spegel',
          },
        ],
      },
    });
    strapi.log.info('Seeded site settings');
  }
}

async function seedPages(strapi: Core.Strapi) {
  const pages = [
    {
      title: 'About',
      slug: 'about',
      pageType: 'about' as const,
      wordpressSourceUrl: 'https://mariusvarhaugvik.com/about/',
    },
    {
      title: 'Contact',
      slug: 'contact',
      pageType: 'contact' as const,
      wordpressSourceUrl: 'https://mariusvarhaugvik.com/contact/',
    },
  ];

  for (const page of pages) {
    const existing = await strapi.db.query('api::page.page').findOne({
      where: { slug: page.slug },
    });

    if (!existing) {
      await strapi.documents('api::page.page').create({
        data: page,
        status: 'published',
      });
      strapi.log.info(`Seeded page: ${page.title}`);
    }
  }
}

async function setPublicPermissions(strapi: Core.Strapi) {
  const publicRole = await strapi.db.query('plugin::users-permissions.role').findOne({
    where: { type: 'public' },
  });

  if (!publicRole) {
    return;
  }

  const permissions = [
    'api::category.category.find',
    'api::category.category.findOne',
    'api::project.project.find',
    'api::project.project.findOne',
    'api::tag.tag.find',
    'api::tag.tag.findOne',
    'api::page.page.find',
    'api::page.page.findOne',
    'api::site-setting.site-setting.find',
  ];

  for (const action of permissions) {
    const existing = await strapi.db.query('plugin::users-permissions.permission').findOne({
      where: {
        role: publicRole.id,
        action,
      },
    });

    if (!existing) {
      await strapi.db.query('plugin::users-permissions.permission').create({
        data: {
          action,
          role: publicRole.id,
        },
      });
    }
  }

  strapi.log.info('Public find permissions enabled for portfolio content types');
}

export default {
  register() {},

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    await seedCategories(strapi);
    await seedTags(strapi);
    await seedSiteSetting(strapi);
    await seedPages(strapi);
    await setPublicPermissions(strapi);
  },
};
