import Image from "next/image";
import Link from "next/link";
import styles from "../styles/FractalLink.module.css";

type FractalLinkProps = {
  href: string;
  imageSrc: string;
  title: string;
};

export const FractalLink = ({ href, imageSrc, title }: FractalLinkProps) => {
  return (
    <div className={styles.gridItem}>
      <article className={styles.card}>
        <Link as={href} href={href}>
          <a className={styles.cardLink}>
            <span className="screen-reader-only">
              Link to the {title} fractal page.
            </span>
          </a>
        </Link>
        <div className={styles.squareImage}>
          <Image src={imageSrc} alt={title} layout="fill" />
        </div>

        <div className={styles.cardContent}>
          <h3 className={styles.cardHeading}>{title}</h3>
        </div>
      </article>
    </div>
  );
};
