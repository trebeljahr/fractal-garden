import Image from "next/legacy/image";
import { useState } from "react";
import styles from "../../styles/lessons/JuliaMap.module.css";
import {
  arrowTip,
  FIGURE_HEIGHT,
  FIGURE_WIDTH,
  JULIA_MAP_PICTURES,
  MAP_BOX,
  mapPosition,
  tileBox,
} from "../../utils/lessons/juliaMap";
import { juliaExplorerLink } from "../../utils/lessons/linkedJulia";
import type { ComplexPoint } from "../../utils/orbitLesson";
import { openView } from "../ArticleImages";

const HEAD_LENGTH = 6;
const HEAD_WIDTH = 2.6;
const DOT_RADIUS = 2.4;

const number = (value: number) => String(value).replace("-", "−");
const label = ({ real, imaginary }: ComplexPoint) => `c = (${number(real)}, ${number(imaginary)})`;

function place({ x, y, size }: { x: number; y: number; size: number }) {
  return {
    left: `${(x / FIGURE_WIDTH) * 100}%`,
    top: `${(y / FIGURE_HEIGHT) * 100}%`,
    width: `${(size / FIGURE_WIDTH) * 100}%`,
  };
}

function Arrow({
  c,
  tip,
  active,
}: {
  c: ComplexPoint;
  tip: { x: number; y: number };
  active: boolean;
}) {
  const dot = mapPosition(c);
  const length = Math.hypot(tip.x - dot.x, tip.y - dot.y);
  const ux = (tip.x - dot.x) / length;
  const uy = (tip.y - dot.y) / length;
  const baseX = tip.x - ux * HEAD_LENGTH;
  const baseY = tip.y - uy * HEAD_LENGTH;
  const line = `M${dot.x} ${dot.y}L${baseX} ${baseY}`;
  const head = [
    [tip.x, tip.y],
    [baseX - uy * HEAD_WIDTH, baseY + ux * HEAD_WIDTH],
    [baseX + uy * HEAD_WIDTH, baseY - ux * HEAD_WIDTH],
  ].join(" ");
  return (
    <g className={active ? styles.active : undefined}>
      <path className={styles.casing} d={line} />
      <polygon className={styles.casing} points={head} />
      <circle className={styles.casing} cx={dot.x} cy={dot.y} r={DOT_RADIUS} />
      <path className={styles.line} d={line} />
      <polygon className={styles.mark} points={head} />
      <circle className={styles.mark} cx={dot.x} cy={dot.y} r={DOT_RADIUS} />
    </g>
  );
}

export default function JuliaMapLesson() {
  const [active, setActive] = useState<string | null>(null);
  return (
    <figure
      className={styles.figure}
      style={{ aspectRatio: `${FIGURE_WIDTH} / ${FIGURE_HEIGHT}` }}
      data-teaching-lesson="julia-map"
    >
      <div className={styles.map} style={place(MAP_BOX)}>
        <Image
          src="/assets/julia-map/mandelbrot.webp"
          width={800}
          height={800}
          layout="responsive"
          alt="The Mandelbrot set, with an arrow from each marked value of c to its Julia set"
        />
      </div>
      {JULIA_MAP_PICTURES.map((picture) => {
        const href = juliaExplorerLink(picture.c);
        return (
          <a
            key={picture.id}
            className={styles.tile}
            style={place(tileBox(picture))}
            href={href}
            data-side={picture.side}
            data-julia-map={`${picture.c.real},${picture.c.imaginary}`}
            onClick={(event) => openView(event, href)}
            onPointerEnter={() => setActive(picture.id)}
            onPointerLeave={() => setActive(null)}
            onFocus={() => setActive(picture.id)}
            onBlur={() => setActive(null)}
          >
            <Image
              src={`/assets/julia-map/julia-${picture.id}.webp`}
              width={400}
              height={400}
              layout="responsive"
              alt={picture.alt}
            />
            <span className={styles.caption}>{label(picture.c)}</span>
          </a>
        );
      })}
      <svg viewBox={`0 0 ${FIGURE_WIDTH} ${FIGURE_HEIGHT}`} aria-hidden="true">
        {JULIA_MAP_PICTURES.map((picture) => (
          <Arrow
            key={picture.id}
            c={picture.c}
            tip={arrowTip(picture)}
            active={active === picture.id}
          />
        ))}
      </svg>
    </figure>
  );
}
