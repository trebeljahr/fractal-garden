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

const OctoCatSvg = () => {
  return (
    <svg viewBox="0 0 32 32" version="1.1" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <mask id="head">
          <rect x="0" y="0" width="32" height="32" fill="white" />
          <path
            d="M13.0799878,23.0788653 C9.51998779,22.6788653 5.79998779,21.2988653 5.79998779,15.1788653 C5.79998779,13.4388653 6.41998779,11.9988653 7.43998779,10.8788653 C7.27998779,10.4788653 6.71998779,8.83886529 7.59998779,6.63886529 C7.59998779,6.63886529 8.93998779,6.21886529 11.9999878,8.27886529 C13.2799878,7.91886529 14.6399878,7.73886529 15.9999878,7.73886529 C17.3599878,7.73886529 18.7199878,7.91886529 19.9999878,8.27886529 C23.0599878,6.19886529 24.3999878,6.63886529 24.3999878,6.63886529 C25.2799878,8.83886529 24.7199878,10.4788653 24.5599878,10.8788653 C25.5799878,11.9988653 26.1999878,13.4188653 26.1999878,15.1788653 C26.1999878,21.3188653 22.4599878,22.6788653 18.8999878,23.0788653 C18.1400123,23.3374399 13.7613513,23.1246319 13.0799878,23.0788653 Z"
            fill="black"
            transform="rotate(0)"
          >
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0 16 21"
              to="15 16 21"
              begin="0s"
              dur="1.6s"
              values="0 16 21;15 16 21;0 15.5 21;-15 16 21;0 16 21"
              keySplines="
            0 0 0.5 1;
            0.5 0 1 1;
            0 0 0.5 1;
            0.5 0 1 1"
              keyTimes="0;0.25;0.5;0.75;1"
              calcMode="spline"
              repeatCount="indefinite"
            />
          </path>
        </mask>
        <mask id="arm">
          <rect x="0" y="0" width="32" height="32" fill="white" />
          <path
            d="M6.64,25.56 C6.46,25.1 5.68,23.68 5,23.3 C4.44,23 3.64,22.26 4.98,22.24 C6.24,22.22 7.14,23.4 7.44,23.88 C8.88,26.3 6.96,26.46 6.64,25.56 Z"
            fill="black"
            transform="rotate(0)"
          >
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0 7.5 25.5"
              to="14 7.5 25.5"
              begin="0s"
              dur="0.4s"
              values="0 10 25.5;-14 7.5 25.5;0 7.5 25.5;"
              keyTimes="0;0.5;1"
              calcMode="linear"
              repeatCount="indefinite"
            />
          </path>
        </mask>
      </defs>
      <g id="loader" mask="url(#head)">
        <path
          d="M0,16 C0,23.08 4.58,29.06 10.94,31.18 C11.74,31.32 12.04,30.84 12.04,30.42 C12.04,30.04 12.02,28.78 12.02,27.44 C8.02970203,27.6507377 6.96,26.46 6.64,25.56 C6.46,25.1 7.14469622,24.843264 7.48451204,24.5191774 C9.49086651,26.4257531 11.18,25.62 12.1,25.2 C12.24,24.16 12.66,23.46 13.12,23.06 C13.58,22.66 18.4268489,22.6804856 18.94,23.06 C19.52,23.56 20.02,24.52 20.02,26.02 C20.02,28.16 20,29.88 20,30.42 C20,30.84 20.3,31.34 21.1,31.18 C27.42,29.06 32,23.06 32,16 C32,7.16 24.84,0 16,0 C7.16,0 0,7.16 0,16 Z"
          id="body"
          fill="var(--yellow-white)"
          mask="url(#arm)"
        ></path>
      </g>
    </svg>
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
          <OctoCatSvg />

          {/* <span className={styles.bigIcon + " icon-github"}>
            <span className="screen-reader-only">GitHub Icon.</span>
          </span> */}
        </div>

        <div className={styles.cardContent}>
          <h3 className={styles.cardHeading}>Grow your own!</h3>
        </div>
      </article>
    </div>
  );
};
