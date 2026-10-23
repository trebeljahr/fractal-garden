import Image from "next/legacy/image";
import styles from "../styles/ArticleImages.module.css";
import { MOSELY_KOCH_LINK } from "../utils/moselyKochView";

const IMAGES = {
  "mosely-koch": [
    {
      name: "mosely-koch-opening",
      alt: "A dark Koch snowflake opening surrounded by blue recursive cube walls inside the Mosely snowflake",
      caption:
        "From the central cavity, a view along a body diagonal reveals a Koch-shaped opening.",
      href: MOSELY_KOCH_LINK,
      width: 1200,
      height: 750,
    },
  ],
  carpet: [
    {
      name: "carpet-depth-1",
      alt: "Sierpinski carpet with one central square removed",
      caption: "After one step, the center square is removed.",
    },
    {
      name: "carpet-depth-3",
      alt: "Sierpinski carpet with three generations of square holes",
      caption: "After three steps, holes of three sizes are visible.",
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
  mandelbrot: [
    {
      name: "mandelbrot-body",
      alt: "Mandelbrot heart-shaped body with a round bulb to its left",
      caption: "The round bulb meets the heart-shaped body at a narrow neck.",
    },
  ],
  julia: [
    {
      name: "julia-rabbit",
      alt: "Julia set using the Rabbit spiral parameter",
      caption: "The Rabbit spiral preset uses the same value of c for every pixel.",
    },
    {
      name: "julia-sea-spiral",
      alt: "Julia set using the Sea spiral parameter",
      caption:
        "The Sea spiral preset changes c for the entire image, producing a different Julia set.",
    },
  ],
  "burning-ship": [
    {
      name: "burning-ship-little",
      alt: "Small Burning Ship with repeated towers above its hull",
      caption: "The Little ship view shows a smaller hull with its own rows of masts.",
    },
  ],
  apollonian: [
    {
      name: "apollonian-level-3",
      alt: "Tangent circles in an Apollonian packing at three iterations",
      caption: "Smaller circles fill the curved gaps left between larger circles.",
    },
  ],
  fern: [
    {
      name: "barnsley-classic",
      alt: "Barnsley fern formed by dots along its stem and leaflets",
      caption: "Four coordinate transformations place dots on the stem and leaflets.",
    },
  ],
} as const;

export type ArticleImageKind = keyof typeof IMAGES;
export function isArticleImageKind(value: unknown): value is ArticleImageKind {
  return typeof value === "string" && Object.hasOwn(IMAGES, value);
}

export default function ArticleImages({ kind }: { kind: ArticleImageKind }) {
  const openView = (event: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      return;
    event.preventDefault();
    if (window.location.hash !== new URL(href, window.location.origin).hash)
      window.history.pushState(null, "", href);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    window.scrollTo(0, 0);
    requestAnimationFrame(() => {
      document
        .querySelector<HTMLCanvasElement>('canvas[aria-label="Explore the fractal interior"]')
        ?.focus({ preventScroll: true });
    });
  };
  return (
    <div className={styles.images}>
      {IMAGES[kind].map((image) => {
        const href = "href" in image ? image.href : undefined;
        const picture = (
          <Image
            src={`/assets/article-images/${image.name}.webp`}
            width={"width" in image ? image.width : 1280}
            height={"height" in image ? image.height : 720}
            alt={image.alt}
            layout="responsive"
          />
        );
        return (
          <figure key={image.name}>
            {href ? (
              <a
                href={href}
                onClick={(event) => openView(event, href)}
                aria-label="Explore the Koch snowflake opening"
              >
                {picture}
              </a>
            ) : (
              picture
            )}
            <figcaption>
              {image.caption}
              {href && (
                <>
                  {" "}
                  <a href={href} onClick={(event) => openView(event, href)}>
                    Explore this view
                  </a>
                </>
              )}
            </figcaption>
          </figure>
        );
      })}
    </div>
  );
}
