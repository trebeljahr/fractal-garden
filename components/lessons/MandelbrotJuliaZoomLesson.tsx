import { type CSSProperties, useState } from "react";
import common from "../../styles/lessons/Lesson.module.css";
import styles from "../../styles/lessons/MandelbrotJuliaZoom.module.css";
import {
  JULIA_ZOOM_COLORING,
  juliaBounds,
  juliaFit,
  MANDELBROT_ZOOM_COLORING,
  mandelbrotBounds,
  ZOOM_PLACES,
  ZOOM_STOPS,
  zoomAt,
} from "../../utils/lessons/mandelbrotJuliaZoom";
import { EscapeTimePicture } from "./EscapeTimePicture";
import { LessonFrame, LessonSteps } from "./LessonFrame";

const PLAY_MS = 8000;
const number = (value: number) => String(Number(value.toFixed(5))).replace("-", "−");

export default function MandelbrotJuliaZoomLesson() {
  const [placeIndex, setPlaceIndex] = useState(0);
  const [stop, setStop] = useState(0);
  const place = ZOOM_PLACES[placeIndex];
  const { degrees, scale, cover } = juliaFit(place.c);
  const zoom = Number(zoomAt(place, stop).toPrecision(2));
  const c = `c = (${number(place.c.real)}, ${number(place.c.imaginary)})`;
  return (
    <LessonFrame title="Zoom in on c in both pictures" kind="mandelbrot-julia-zoom">
      <div className={common.options}>
        {ZOOM_PLACES.map((option, index) => (
          <button
            type="button"
            key={option.name}
            aria-pressed={index === placeIndex}
            onClick={() => {
              setPlaceIndex(index);
              setStop(0);
            }}
          >
            {option.name}
          </button>
        ))}
      </div>
      <LessonSteps
        key={place.name}
        step={stop}
        max={ZOOM_STOPS}
        onChange={setStop}
        label="Zoom"
        duration={PLAY_MS}
        stepDescription={`Zoom ×${zoom}`}
      />
      <div className={styles.pair}>
        <div>
          <h3>Mandelbrot set</h3>
          <div
            className={styles.picture}
            role="img"
            aria-label={`Mandelbrot set around ${c}, zoomed ${zoom} times`}
            style={{ "--cover": 1, "--turn": "0deg" } as CSSProperties}
          >
            <EscapeTimePicture
              formula="mandelbrot"
              bounds={mandelbrotBounds(place, stop)}
              coloring={MANDELBROT_ZOOM_COLORING}
            />
          </div>
        </div>
        <div>
          <h3>Julia set for c</h3>
          <div
            className={styles.picture}
            role="img"
            aria-label={`Julia set for ${c}, around c, zoomed ${zoom} times`}
            style={{ "--cover": cover, "--turn": `${degrees}deg` } as CSSProperties}
          >
            <EscapeTimePicture
              formula="julia"
              bounds={juliaBounds(place, stop)}
              coloring={JULIA_ZOOM_COLORING}
              c={place.c}
            />
          </div>
        </div>
      </div>
      <p>
        {c}. Julia picture turned {Math.round(Math.abs(degrees))}° counterclockwise and scaled ×
        {Number((1 / scale).toPrecision(3))}.
      </p>
    </LessonFrame>
  );
}
