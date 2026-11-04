import styles from "../../styles/lessons/JuliaMap.module.css";
import { ZOOM_MAP_PICTURES } from "../../utils/lessons/mandelbrotZoomMap";
import PictureRingMap from "./PictureRingMap";

export default function MandelbrotZoomMapLesson() {
  return (
    <PictureRingMap
      lesson="mandelbrot-zoom-map"
      fillWidth
      mapAlt="The Mandelbrot set, with an arrow from each marked place to a deep zoom of it"
      pictures={ZOOM_MAP_PICTURES.map((picture) => ({
        ...picture,
        src: `/assets/mandelbrot-zoom-map/${picture.id}.webp`,
        label: `Open ${picture.label} in the explorer`,
        caption: (
          <>
            10<sup className={styles.power}>{picture.exponent}</sup>× closer
          </>
        ),
      }))}
    />
  );
}
