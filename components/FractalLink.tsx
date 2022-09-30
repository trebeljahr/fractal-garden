import Image, { StaticImageData } from "next/future/image";
import Link from "next/link";
import styles from "../styles/FractalLink.module.css";
import useDimensions from "react-cool-dimensions";
import { CSSProperties } from "react";

type FractalLinkProps = {
  href: string;
  imageSrc: StaticImageData;
  title: string;
  prio?: boolean;
};

export const FractalLink = ({
  href,
  imageSrc,
  title,
  prio = false,
}: FractalLinkProps) => {
  const { observe, width, height } = useDimensions<HTMLDivElement | null>();

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
        <div className={styles.squareImage} ref={observe}>
          <Image
            src={imageSrc}
            alt={title}
            placeholder="blur"
            width={width}
            height={height}
            className={styles.squareImage}
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
          <span className="screen-reader-only">
            Link to the contribution page on GitHub.
          </span>
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
