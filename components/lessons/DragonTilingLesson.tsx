import { useId, useMemo, useState } from "react";
import styles from "../../styles/lessons/DragonTilingLesson.module.css";
import shared from "../../styles/lessons/Lesson.module.css";
import { dragonGroups, dragonTile } from "../../utils/lessons/dragonTiling";
import { LESSON_SYSTEMS } from "../../utils/lessons/lsystemLesson";
import { rewriteSentence, traceTurtle } from "../../utils/turtleCurves";
import { LessonFrame } from "./LessonFrame";

const COLORS = ["#f5c56d", "#7ec9bb", "#d68fa3", "#97ade0"];
const VIEWS = ["One dragon", "Fit four together", "Tile the plane"];
const EXPLANATIONS = [
  "Each path segment joins opposite corners of a filled square. These squares form one tile.",
  "The four copies start at one point. They are rotated by 0, 90, 180 and 270 degrees.",
  "The four-tile groups repeat in diagonal rows, with no gaps between their boundaries.",
];

export default function DragonTilingLesson() {
  const id = useId().replace(/:/g, "");
  const [view, setView] = useState(2);
  const [detail, setDetail] = useState(8);
  const [gap, setGap] = useState(0);
  const [showPath, setShowPath] = useState(false);
  const tile = useMemo(() => {
    const system = LESSON_SYSTEMS.dragon;
    const word = rewriteSentence(system.axiom, system.rules, detail);
    return dragonTile(traceTurtle(word, { turnAngle: Math.PI / 2, drawChars: system.draw }).points);
  }, [detail]);
  const groups = view === 2 ? dragonGroups(4) : [{ x: 0, y: 0, key: "0:0" }];
  const separation = view === 0 ? 0 : gap;
  const size = view === 2 ? 4.6 : 3.1 + separation / 80;
  const spread = 1 + separation / 140;
  const explanation = separation
    ? "The tiles are separated to show their boundaries. Set Pull apart to zero to join them."
    : EXPLANATIONS[view];
  return (
    <LessonFrame title="Dragon tiles" kind="dragon-tiling">
      <fieldset className={shared.options} aria-label="Dragon tiling view">
        {VIEWS.map((label, index) => (
          <button
            type="button"
            key={label}
            aria-pressed={view === index}
            onClick={() => setView(index)}
          >
            {label}
          </button>
        ))}
      </fieldset>
      <svg
        className={styles.drawing}
        viewBox={`${(view === 0 ? 0.5 : 0) - size / 2} ${-size / 2} ${size} ${size}`}
        role="img"
        aria-labelledby={`${id}-title ${id}-description`}
      >
        <title id={`${id}-title`}>{VIEWS[view]}</title>
        <desc id={`${id}-description`}>
          {explanation}{" "}
          {separation
            ? "Tiles are pulled apart to show their edges."
            : "Tiles are fitted together."}
        </desc>
        <defs>
          <path id={`${id}-tile`} d={tile.outline} />
          <path id={`${id}-path`} d={tile.path} />
        </defs>
        <g transform="scale(1 -1)">
          {groups.map(({ x, y, key }) => (
            <g
              key={key}
              transform={`translate(${x * spread} ${y * spread})`}
              className={styles.move}
            >
              {COLORS.slice(0, view === 0 ? 1 : 4).map((color, turn) => (
                <g key={color} transform={`rotate(${turn * 90})`}>
                  <g transform={`translate(${separation / 180} 0)`} className={styles.move}>
                    <use href={`#${id}-tile`} fill={color} />
                    {showPath && <use href={`#${id}-path`} className={styles.path} />}
                  </g>
                </g>
              ))}
            </g>
          ))}
          {view === 1 && <circle r="0.025" fill="#10151a" stroke="#eee8ce" strokeWidth="0.012" />}
        </g>
      </svg>
      <p className={styles.explanation} aria-live="polite">
        {explanation}
      </p>
      <div className={styles.parameters}>
        <label className={shared.parameter}>
          <span>
            Pull apart <output>{separation}%</output>
          </span>
          <input
            type="range"
            min={0}
            max={100}
            value={separation}
            disabled={view === 0}
            aria-label="Pull dragon tiles apart"
            onChange={(event) => setGap(Number(event.target.value))}
          />
        </label>
        <label className={shared.parameter}>
          <span>
            Detail <output>{detail}</output>
          </span>
          <input
            type="range"
            min={0}
            max={10}
            value={detail}
            aria-label="Dragon tile detail"
            onChange={(event) => setDetail(Number(event.target.value))}
          />
        </label>
      </div>
      <button type="button" aria-pressed={showPath} onClick={() => setShowPath(!showPath)}>
        {showPath ? "Hide the path" : "Show the path"}
      </button>
      <p>
        Increasing Detail adds shorter path segments and smaller squares around them. The filled
        regions approach the limiting dragon tile as their segment lengths decrease.
      </p>
    </LessonFrame>
  );
}
