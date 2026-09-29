import Link from "next/link";
import styles from "../styles/Footer.module.css";
import { DONATE_URL } from "../utils/donation";
import { ProjectDonateLink } from "./ProjectDonateLink";

export const Footer = () => {
  return (
    <footer className={styles.footer}>
      <p className={styles.byline}>
        Made with{" "}
        <svg
          aria-hidden="true"
          className={styles.heart}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 0 1-.383-.218 25.18 25.18 0 0 1-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0 1 12 5.052 5.5 5.5 0 0 1 16.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 0 1-4.244 3.17 15.247 15.247 0 0 1-.383.219l-.022.012-.007.004-.003.001a.752.752 0 0 1-.704 0l-.003-.001z" />
        </svg>
        <span className="screen-reader-only">love</span> by{" "}
        <a href="https://trebeljahr.com">Rico Trebeljahr</a>
      </p>
      <span className={styles.separator} aria-hidden="true">
        |
      </span>
      <nav className={styles.links} aria-label="Footer">
        <ProjectDonateLink href={DONATE_URL}>Donate</ProjectDonateLink>
        <span className={styles.separator} aria-hidden="true">
          |
        </span>
        <Link href="/imprint" passHref>
          <a href="/imprint">Imprint</a>
        </Link>
      </nav>
    </footer>
  );
};
