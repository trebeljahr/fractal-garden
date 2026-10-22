import Image from "next/legacy/image";
import styles from "../styles/ArticleImages.module.css";

const IMAGES = {
  carpet: [
    {
      name: "carpet-depth-1",
      alt: "Sierpinski carpet with one central square removed",
      caption: "One cut removes the middle ninth.",
    },
    {
      name: "carpet-depth-3",
      alt: "Sierpinski carpet with three generations of square holes",
      caption: "Three cuts repeat the same hole inside every remaining square.",
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
      caption: "The next step repeats those openings inside each surviving block.",
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
      caption: "Rabbit spiral chooses one constant for the whole image.",
    },
    {
      name: "julia-sea-spiral",
      alt: "Julia set using the Sea spiral parameter",
      caption: "Sea spiral changes the constant. Every pixel now follows the new rule.",
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
      caption: "The same transformations produce the stem and repeated leaflets.",
    },
  ],
} as const;

export type ArticleImageKind = keyof typeof IMAGES;
export function isArticleImageKind(value: unknown): value is ArticleImageKind {
  return typeof value === "string" && Object.hasOwn(IMAGES, value);
}

export default function ArticleImages({ kind }: { kind: ArticleImageKind }) {
  return (
    <div className={styles.images}>
      {IMAGES[kind].map((image) => (
        <figure key={image.name}>
          <Image
            src={`/assets/article-images/${image.name}.webp`}
            width={1280}
            height={720}
            alt={image.alt}
            layout="responsive"
          />
          <figcaption>{image.caption}</figcaption>
        </figure>
      ))}
    </div>
  );
}
