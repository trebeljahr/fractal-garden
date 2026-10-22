import Image from "next/legacy/image";
import Link from "next/link";
import { useRouter } from "next/router";
import styles from "../styles/RelatedFractals.module.css";
import { PAGE_SEO } from "../utils/pageSeo";
import { getRelatedFractals } from "../utils/relatedFractals";

export function RelatedFractals() {
  const { pathname } = useRouter();
  const related = getRelatedFractals(pathname);
  if (!related.length) return null;
  return (
    <nav className={styles.related} aria-labelledby="related-fractals-heading">
      <h2 id="related-fractals-heading">Related fractals</h2>
      <div className={styles.links}>
        {related.map(({ href, reason }) => {
          const entry = PAGE_SEO[href];
          return (
            <Link key={href} legacyBehavior href={href}>
              <a href={href} className={styles.link}>
                <span className={styles.image}>
                  <Image
                    src={entry.imagePath}
                    alt=""
                    layout="fill"
                    objectFit="contain"
                    sizes="(max-width: 600px) 88px, 128px"
                  />
                </span>
                <span className={styles.copy}>
                  <span className={styles.name}>{entry.title}</span>
                  <span className={styles.reason}>{reason}</span>
                </span>
              </a>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
