import { useRouter } from "next/router";
import styles from "../styles/RelatedFractals.module.css";
import { FRACTAL_TILES } from "../utils/fractalTiles";
import { getFractalName } from "../utils/pageSeo";
import { getRelatedFractals } from "../utils/relatedFractals";
import { FractalLink } from "./FractalLink";

export function RelatedFractals() {
  const { pathname } = useRouter();
  const related = getRelatedFractals(pathname);
  if (!related.length) return null;
  return (
    <nav className={styles.related} aria-labelledby="related-fractals-heading">
      <h2 id="related-fractals-heading">Related fractals</h2>
      <div className={styles.links}>
        {related.map(({ href, reason }) => (
          <FractalLink
            key={href}
            href={href}
            imageSrc={FRACTAL_TILES[href].imageSrc}
            title={getFractalName(href)}
            variant="related"
            reason={reason}
          />
        ))}
      </div>
    </nav>
  );
}
