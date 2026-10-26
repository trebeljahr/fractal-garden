import { useMemo, useState } from "react";
import motion from "../../styles/lessons/Investigations.module.css";
import styles from "../../styles/lessons/Lesson.module.css";
import { lessonSegments, PATH_LESSONS, type PathLessonKind } from "../../utils/lessons/pathLessons";
import { LessonFrame, LessonSteps } from "./LessonFrame";

export default function PathLesson({ kind }: { kind: PathLessonKind }) {
  const info = PATH_LESSONS[kind];
  const [level, setLevel] = useState(
    kind === "hilbert-curve-3d"
      ? 2
      : kind === "fibonacci-word-fractal"
        ? 7
        : kind === "twindragon" || kind === "levy-curve"
          ? 5
          : ["fern-1", "fern-2", "fern-4", "terdragon", "sierpinski-arrowhead"].includes(kind)
            ? 3
            : 2,
  );
  const [progress, setProgress] = useState(0);
  const [angle, setAngle] = useState(
    kind === "cesaro-fractal"
      ? 85
      : kind === "fibonacci-word-fractal"
        ? 90
        : kind === "fern-1"
          ? -25
          : kind === "fern-2"
            ? 25.7
            : kind === "fern-3"
              ? 22.5
              : kind === "fern-4"
                ? 20
                : 25,
  );
  const [view, setView] = useState(30);
  const [branches, setBranches] = useState(true);
  const adjustable =
    kind.startsWith("fern-") ||
    kind === "cesaro-fractal" ||
    kind === "fibonacci-word-fractal" ||
    kind === "l-system-explorer";
  const geometry = useMemo(
    () => lessonSegments(kind, level, adjustable ? angle : undefined),
    [kind, level, angle, adjustable],
  );
  const projected = useMemo(() => {
    const yaw = (view * Math.PI) / 180;
    const project = (p: number[]) =>
      kind === "hilbert-curve-3d"
        ? [
            p[0] * Math.cos(yaw) + (p[2] ?? 0) * Math.sin(yaw),
            -p[1] + ((p[2] ?? 0) * Math.cos(yaw) - p[0] * Math.sin(yaw)) * 0.4,
          ]
        : [p[0], -p[1]];
    const segments = geometry.map((s) => ({ ...s, a: project(s.a), b: project(s.b) }));
    const points = segments.flatMap((s) => [s.a, s.b]);
    const xs = points.map((p) => p[0]),
      ys = points.map((p) => p[1]);
    const minX = Math.min(0, ...xs),
      maxX = Math.max(0, ...xs),
      minY = Math.min(0, ...ys),
      maxY = Math.max(0, ...ys);
    const scale = Math.min(420 / Math.max(maxX - minX, 1), 270 / Math.max(maxY - minY, 1));
    const fit = (p: number[]) => [
      240 + (p[0] - (minX + maxX) / 2) * scale,
      155 + (p[1] - (minY + maxY) / 2) * scale,
    ];
    return segments.map((s) => ({ ...s, a: fit(s.a), b: fit(s.b) }));
  }, [geometry, view, kind]);
  const count = Math.min(projected.length, progress);
  const path = (start: number, end: number) =>
    projected
      .slice(start, end)
      .map((s) => `M${s.a[0]},${s.a[1]}L${s.b[0]},${s.b[1]}`)
      .join(" ");
  const current = projected[count - 1];
  return (
    <LessonFrame title={info.title} kind={`path-${kind}`}>
      <p>{info.idea}</p>
      <svg
        viewBox="0 0 480 310"
        role="img"
        aria-label={`${info.title}. ${count} of ${projected.length} segments traced.`}
      >
        <path d={path(0, projected.length)} className={motion.reference} />
        <path d={path(0, count)} className={styles.line} />
        {branches && (
          <path
            d={projected
              .slice(0, count)
              .filter((s) => s.group > 0)
              .map((s) => `M${s.a[0]},${s.a[1]}L${s.b[0]},${s.b[1]}`)
              .join(" ")}
            className={motion.branch}
          />
        )}
        {current && (
          <>
            <path d={path(Math.max(0, count - 1), count)} className={styles.accent} />
            <circle cx={current.b[0]} cy={current.b[1]} r="4" className={styles.point} />
          </>
        )}
      </svg>
      <div className={motion.readout} aria-live="polite">
        {count} of {projected.length} lines drawn · Round {level}
      </div>
      <LessonSteps
        key={`${level}-${angle}`}
        step={progress}
        max={projected.length}
        duration={4500}
        onChange={setProgress}
        label={`${info.title} trace`}
      />
      <label className={styles.parameter}>
        <span>
          Round
          <output>{level}</output>
        </span>
        <input
          aria-label={`${info.title} round`}
          type="range"
          min={kind === "hilbert-curve-3d" ? 1 : 0}
          max={info.max}
          value={level}
          onChange={(e) => {
            setLevel(Number(e.target.value));
            setProgress(0);
          }}
        />
      </label>
      {adjustable && (
        <label className={styles.parameter}>
          <span>
            Bend angle <output>{angle}°</output>
          </span>
          <input
            type="range"
            aria-label="Bend angle"
            min={kind === "cesaro-fractal" ? 60 : kind === "fern-1" ? -90 : 10}
            max={kind === "cesaro-fractal" ? 89 : 100}
            value={angle}
            onChange={(e) => {
              setAngle(Number(e.target.value));
              setProgress(0);
            }}
          />
        </label>
      )}
      {kind === "hilbert-curve-3d" && (
        <label className={styles.parameter}>
          <span>
            View angle <output>{view}°</output>
          </span>
          <input
            type="range"
            aria-label="View angle"
            min={0}
            max={180}
            value={view}
            onChange={(e) => setView(Number(e.target.value))}
          />
        </label>
      )}
      {(kind.startsWith("fern-") || kind === "l-system-explorer" || kind === "twindragon") && (
        <label className={motion.checkbox}>
          <input
            type="checkbox"
            checked={branches}
            onChange={(e) => setBranches(e.target.checked)}
          />
          {kind === "twindragon" ? "Highlight the second dragon" : "Highlight side branches"}
        </label>
      )}
      <p>{info.detail}</p>
      <p>{info.takeaway}</p>
    </LessonFrame>
  );
}
