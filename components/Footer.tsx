import Link from "next/link";
import styles from "../styles/Footer.module.css";

export const Footer = () => {
  return (
    <footer className={styles.footer}>
      <p>
        Made with <span className={styles.heart}>♥</span> by{" "}
        <a href="https://trebeljahr.com">Rico Trebeljahr</a>
      </p>
      <span className={styles.separator} aria-hidden="true">
        |
      </span>
      <p>
        <Link href="/imprint">Imprint</Link>
      </p>
    </footer>
  );
};
