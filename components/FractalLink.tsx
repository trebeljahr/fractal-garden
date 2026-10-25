import Image, { type StaticImageData } from "next/legacy/image";
import Link from "next/link";
import styles from "../styles/FractalLink.module.css";

type FractalLinkProps = {
  href: string;
  imageSrc: StaticImageData;
  title: string;
  prio?: boolean;
};

export const FractalLink = ({ href, imageSrc, title, prio = false }: FractalLinkProps) => {
  return (
    <div className={styles.gridItem}>
      <article className={styles.card}>
        <Link href={href} prefetch={false} className={styles.cardLink}>
          <span className="screen-reader-only">Link to the {title} fractal page.</span>
        </Link>
        <div className={styles.squareImage}>
          <Image
            src={imageSrc}
            alt={title}
            // Development blur URLs need an image optimizer; static export disables it.
            placeholder={process.env.NODE_ENV === "development" ? "empty" : "blur"}
            layout="fill"
            objectFit="cover"
            objectPosition="center"
            sizes="(min-width: 1350px) 30vw, (min-width: 900px) 45vw, 90vw"
            priority={prio}
          />
        </div>

        <div className={styles.cardContent}>
          <h3 className={styles.cardHeading}>{title}</h3>
        </div>
      </article>
    </div>
  );
};

export const AddMoreLink = () => {
  return (
    <div className={styles.gridItem}>
      <article className={styles.card}>
        <a
          href="https://github.com/trebeljahr/fractal-garden"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.cardLink}
        >
          <span className="screen-reader-only">Link to the contribution page on GitHub.</span>
        </a>
        <div className={styles.squareImage + " " + styles.centerIcon}>
          <span className={styles.bigIcon + " icon-github"}>
            <span className="screen-reader-only">GitHub Icon.</span>
          </span>
        </div>

        <div className={styles.cardContent}>
          <h3 className={styles.cardHeading}>Grow your own!</h3>
        </div>
      </article>
    </div>
  );
};
