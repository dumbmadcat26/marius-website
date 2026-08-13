import Link from "next/link";
import styles from "./SiteHeader.module.css";

type Props = {
  siteName: string;
  tagline?: string | null;
  active?: "work" | "about";
};

export function SiteHeader({ siteName, tagline, active = "work" }: Props) {
  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <Link href="/" className={styles.siteName}>
          {siteName}
        </Link>
        {tagline ? <p className={styles.tagline}>{tagline}</p> : null}
      </div>
      <nav className={styles.nav} aria-label="Primary">
        <Link
          href="/"
          className={active === "work" ? styles.navActive : styles.navLink}
        >
          Work
        </Link>
        <Link
          href="/about/"
          className={active === "about" ? styles.navActive : styles.navLink}
        >
          About
        </Link>
      </nav>
    </header>
  );
}
