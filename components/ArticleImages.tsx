import Image from "next/legacy/image";
import type { ReactNode } from "react";
import styles from "../styles/ArticleImages.module.css";
import { MOSELY_KOCH_LINK } from "../utils/moselyKochView";

const IMAGES = {
  "mosely-koch": [
    {
      name: "mosely-koch-opening",
      alt: "A dark snowflake-shaped opening seen from the center of a Mosely snowflake with its center cubes removed, surrounded by blue cube walls",
      caption:
        "With the center cubes removed, look from inside toward a missing corner cube. The opening has a snowflake outline.",
      href: MOSELY_KOCH_LINK,
      label: "Explore the Koch snowflake opening",
      action: "Explore this view",
      width: 1160,
      height: 648,
    },
  ],
  menger: [
    {
      name: "menger-level-1",
      alt: "Menger sponge after the first cube-removal step",
      caption: "One removal step opens the large tunnels.",
    },
    {
      name: "menger-level-2",
      alt: "Menger sponge with smaller tunnels in its walls",
      caption: "The next step removes seven smaller cubes inside each remaining cube.",
    },
  ],
  "mandelbrot-printout": [
    {
      name: "mandelbrot-printout",
      alt: "The Mandelbrot set drawn in rows of asterisks, with small detached groups of asterisks mirrored at the top and bottom",
      caption:
        "A modern copy of a 1978 text printout by Brooks and Matelski, not one of Mandelbrot's. Its detached specks also come in top and bottom pairs.",
      width: 700,
      height: 560,
    },
  ],
  "burning-ship": [
    {
      name: "burning-ship-little",
      alt: "Small Burning Ship with repeated towers above its hull",
      caption: "The Little ship view shows a smaller hull with its own rows of masts.",
    },
  ],
} as const;

export type ArticleImageKind = keyof typeof IMAGES;
export function isArticleImageKind(value: unknown): value is ArticleImageKind {
  return typeof value === "string" && Object.hasOwn(IMAGES, value);
}

export function openView(event: React.MouseEvent<HTMLAnchorElement>, href: string) {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
    return;
  event.preventDefault();
  if (window.location.hash !== new URL(href, window.location.origin).hash)
    window.history.pushState(null, "", href);
  // A view that saves no camera opens at the page's usual framing.
  window.dispatchEvent(new Event("garden:reset-pose"));
  window.dispatchEvent(new HashChangeEvent("hashchange"));
  window.scrollTo(0, 0);
  requestAnimationFrame(() => {
    document
      .querySelector<HTMLCanvasElement>('canvas[aria-label="Explore the fractal interior"]')
      ?.focus({ preventScroll: true });
  });
}

export default function ArticleImages({ kind }: { kind: ArticleImageKind }) {
  return (
    <div className={styles.images}>
      {IMAGES[kind].map((image) => {
        const href = "href" in image ? image.href : undefined;
        const link = (content: ReactNode, label?: string) =>
          href ? (
            <a href={href} onClick={(event) => openView(event, href)} aria-label={label}>
              {content}
            </a>
          ) : (
            content
          );
        return (
          <figure key={image.name}>
            {link(
              <Image
                src={`/assets/article-images/${image.name}.webp`}
                width={"width" in image ? image.width : 1280}
                height={"height" in image ? image.height : 720}
                alt={image.alt}
                layout="responsive"
              />,
              "label" in image ? image.label : undefined,
            )}
            <figcaption>
              {"action" in image ? (
                <>
                  {image.caption} {link(image.action)}
                </>
              ) : (
                link(image.caption)
              )}
            </figcaption>
          </figure>
        );
      })}
    </div>
  );
}
