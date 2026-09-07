import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { mediaUrl } from "@/lib/media";
import { getSiteSetting } from "@/lib/strapi";
import styles from "./about.module.css";

export const metadata: Metadata = {
  title: "About",
};

export default async function AboutPage() {
  const site = await getSiteSetting();

  if (!site) {
    return (
      <main className="shell">
        <SiteHeader siteName="Marius Varhaugvik" active="about" />
        <p>Site settings are not available yet.</p>
      </main>
    );
  }

  // Prefer Strapi responsive formats; fall back to the raw upload URL.
  const portrait =
    mediaUrl(site.portrait, "large") ||
    mediaUrl(site.portrait, "medium") ||
    mediaUrl(site.portrait);
  const socials = (site.socialLinks || []).filter(
    (link) => link.url && !/^https?:\/\/(www\.)?(instagram|linkedin|youtube|facebook)\.com\/?$/i.test(link.url),
  );

  return (
    <main className="shell">
      <SiteHeader
        siteName={site.siteName}
        tagline={site.tagline}
        active="about"
      />

      <article className={styles.article}>
        <div className={styles.copy}>
          <h1 className={styles.heading}>About</h1>

          {site.bioIntro ? <p className={styles.lead}>{site.bioIntro}</p> : null}
          {site.locationNote ? (
            <p className={styles.text}>{site.locationNote}</p>
          ) : null}

          <section className={styles.section}>
            <h2>Contact</h2>
            <ul className={styles.plainList}>
              {site.email ? (
                <li>
                  <a href={`mailto:${site.email}`}>{site.email}</a>
                </li>
              ) : null}
              {site.phone ? (
                <li>
                  <a href={`tel:${site.phone.replace(/\s+/g, "")}`}>{site.phone}</a>
                </li>
              ) : null}
            </ul>
          </section>

          {(site.internships || []).length > 0 ? (
            <section className={styles.section}>
              <h2>Internship</h2>
              <ul className={styles.plainList}>
                {(site.internships || []).map((item) => (
                  <li key={`${item.label}-${item.url}`}>
                    {item.url ? (
                      <a href={item.url} target="_blank" rel="noreferrer">
                        {item.label}
                      </a>
                    ) : (
                      item.label
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {(site.education || []).length > 0 ? (
            <section className={styles.section}>
              <h2>Education</h2>
              <ul className={styles.plainList}>
                {(site.education || []).map((item) => (
                  <li key={`${item.institution}-${item.years}`}>
                    <strong>{item.institution}</strong>
                    {item.years ? `, ${item.years}` : ""}
                    {item.program ? ` — ${item.program}` : ""}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {(site.awards || []).length > 0 ? (
            <section className={styles.section}>
              <h2>Awards</h2>
              <ul className={styles.plainList}>
                {(site.awards || []).map((item) => (
                  <li key={`${item.title}-${item.year}`}>
                    {item.organization ? `${item.organization}` : ""}
                    {item.year ? `${item.organization ? ", " : ""}${item.year}` : ""}
                    {item.organization || item.year ? " — " : ""}
                    {item.title}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {(site.whatIDo || []).length > 0 ? (
            <section className={styles.section}>
              <h2>What I do</h2>
              <ul className={styles.plainList}>
                {(site.whatIDo || []).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {socials.length > 0 ? (
            <section className={styles.section}>
              <h2>Elsewhere</h2>
              <ul className={styles.plainList}>
                {socials.map((link) => (
                  <li key={link.url}>
                    <a href={link.url} target="_blank" rel="noreferrer">
                      {link.label || link.platform || link.url}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        {portrait ? (
          <div className={styles.media}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className={styles.portrait}
              src={portrait}
              alt={site.portrait?.alternativeText || site.siteName}
            />
          </div>
        ) : null}
      </article>
    </main>
  );
}
