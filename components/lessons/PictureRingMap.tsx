import Image from "next/legacy/image";
import { type ReactNode, useState } from "react";
import styles from "../../styles/lessons/JuliaMap.module.css";
import {
  arrowTip,
  FIGURE_HEIGHT,
  FIGURE_WIDTH,
  MAP_BOX,
  mapPosition,
  type Picture,
  tileBox,
} from "../../utils/lessons/juliaMap";
import type { ComplexPoint } from "../../utils/orbitLesson";
import { openView } from "../ArticleImages";

const HEAD_LENGTH = 6;
const HEAD_WIDTH = 2.6;
const DOT_RADIUS = 2.4;

function place({ x, y, width }: { x: number; y: number; width: number }) {
  return {
    left: `${(x / FIGURE_WIDTH) * 100}%`,
    top: `${(y / FIGURE_HEIGHT) * 100}%`,
    width: `${(width / FIGURE_WIDTH) * 100}%`,
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

type RingPicture = Picture & { href: string; src: string; caption: ReactNode; label?: string };

/** The Mandelbrot picture, a ring of linked pictures around it, and an arrow to each one. */
export default function PictureRingMap({
  lesson,
  mapAlt,
  pictures,
  fillWidth = false,
}: {
  lesson: string;
  mapAlt: string;
  pictures: RingPicture[];
  fillWidth?: boolean;
}) {
  const [active, setActive] = useState<string | null>(null);
  return (
    <figure
      className={`${styles.figure} ${fillWidth ? styles.fillWidth : ""}`.trim()}
      style={{ aspectRatio: `${FIGURE_WIDTH} / ${FIGURE_HEIGHT}` }}
      data-teaching-lesson={lesson}
    >
      <div className={styles.map} style={place(MAP_BOX)}>
        <Image
          src="/assets/julia-map/mandelbrot.webp"
          width={MAP_BOX.width * 4}
          height={MAP_BOX.height * 4}
          layout="responsive"
          alt={mapAlt}
        />
      </div>
      {pictures.map((picture) => (
        <a
          key={picture.id}
          className={styles.tile}
          style={place(tileBox(picture))}
          href={picture.href}
          aria-label={picture.label}
          data-ring-map={`${picture.c.real},${picture.c.imaginary}`}
          onClick={(event) => openView(event, picture.href)}
          onPointerEnter={() => setActive(picture.id)}
          onPointerLeave={() => setActive(null)}
          onFocus={() => setActive(picture.id)}
          onBlur={() => setActive(null)}
        >
          <Image src={picture.src} width={400} height={400} layout="responsive" alt={picture.alt} />
          <span className={styles.caption}>{picture.caption}</span>
        </a>
      ))}
      <svg viewBox={`0 0 ${FIGURE_WIDTH} ${FIGURE_HEIGHT}`} aria-hidden="true">
        {pictures.map((picture) => (
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
