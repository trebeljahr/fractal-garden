import styles from "../../styles/lessons/JuliaMap.module.css";
import { MANDELBROT_COLORING } from "../../utils/escapeTimeColoring";
import { JULIA_MAP_PICTURES } from "../../utils/lessons/juliaMap";
import { juliaExplorerLink } from "../../utils/lessons/linkedJulia";
import type { ComplexPoint } from "../../utils/orbitLesson";
import PictureRingMap from "./PictureRingMap";

const number = (value: number) => String(value).replace("-", "−");
const coordinates = ({ real, imaginary }: ComplexPoint) =>
  `(${number(real)}, ${number(imaginary)})`;

export default function JuliaMapLesson() {
  return (
    <PictureRingMap
      lesson="julia-map"
      mapAlt="The Mandelbrot set, with an arrow from each marked value of c to its Julia set"
      pictures={JULIA_MAP_PICTURES.map((picture) => ({
        ...picture,
        href: juliaExplorerLink(picture.c, MANDELBROT_COLORING),
        src: `/assets/julia-map/julia-${picture.id}.webp`,
        caption: (
          <>
            <span className={styles.prefix}>c = </span>
            {coordinates(picture.c)}
          </>
        ),
      }))}
    />
  );
}
