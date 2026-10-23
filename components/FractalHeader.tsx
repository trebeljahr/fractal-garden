import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import type { ReactNode } from "react";
import styles from "../styles/FractalHeader.module.css";
import { getFractalName } from "../utils/pageSeo";

export function FractalHeader({
  title,
  lines = [],
  places,
  controls,
}: {
  title?: string;
  lines?: string[];
  places?: ReactNode;
  controls?: ReactNode;
}) {
  const router = useRouter();
  const descriptionLines = lines.filter((line) => !/^Drag to (pan|rotate)\./.test(line));

  return (
    <header className={styles.header} data-fractal-chrome>
      <nav
        className={`${styles.bar} ${controls ? styles.withControls : ""}`}
        aria-label="Garden navigation"
      >
        <Link href="/" className={styles.home} aria-label="Fractal Garden home">
          <Image src="/assets/favicon/android-chrome-192x192.png" alt="" width={24} height={24} />
          <span>Fractal Garden</span>
        </Link>
        <div className={styles.overview}>
          <h1>{title || getFractalName(router.pathname)}</h1>
          {descriptionLines.length > 0 && (
            <div className={styles.copy}>
              {descriptionLines.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          )}
        </div>
        {controls && (
          <div className={styles.controls} data-fractal-header-controls>
            {controls}
          </div>
        )}
        {places && <div className={styles.places}>{places}</div>}
      </nav>
    </header>
  );
}
