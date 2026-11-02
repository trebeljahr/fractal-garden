import { useMemo, useState } from "react";
import motion from "../../styles/lessons/Investigations.module.css";
import styles from "../../styles/lessons/Lesson.module.css";
import { mandelbarEscapes, matchingOrbits, rotatePoint } from "../../utils/lessons/mandelbarLesson";
import { LessonFrame, LessonSteps } from "./LessonFrame";
import { PlaneStage, planePixels } from "./PlaneStage";

const BOUNDS = [-2.3, 2.3, -2.3, 2.3] as const;
const COLORS = ["#f5c56d", "#7ec9bb", "#d68fa3", "#97ade0", "#c7a4ef", "#9fd17f", "#ef9a6b"];
const LIMIT = 16;
// The server and browser can disagree in the last digit of a cosine.
const fixed = (value: number) => value.toFixed(4);

function paintSet(image: ImageData, power: number) {
  const pixels = planePixels(image);
  const { width, height } = image;
  for (let row = 0; row < height; row++) {
    for (let column = 0; column < width; column++) {
      const x = BOUNDS[0] + ((column + 0.5) / width) * (BOUNDS[1] - BOUNDS[0]);
      const y = BOUNDS[3] - ((row + 0.5) / height) * (BOUNDS[3] - BOUNDS[2]);
      const jumps = mandelbarEscapes({ x, y }, power);
      const shade = jumps === 0 ? 0xffc8d0d8 : 0xff1a1510 + Math.min(40, jumps * 3) * 0x010101;
      pixels[row * width + column] = shade;
    }
  }
}

export default function MandelbarLesson() {
  const [power, setPower] = useState(2);
  const [c, setC] = useState({ x: -0.55, y: 0.45 });
  const [step, setStep] = useState(4);
  const routes = useMemo(() => matchingOrbits(c, power, LIMIT), [c, power]);
  const longest = Math.max(...routes.map((route) => route.length - 1));
  const shown = Math.min(step, longest);
  return (
    <LessonFrame title="Rotate the pixel, rotate its route" kind="mandelbar-turns">
      <p>
        Drag the point. The other colors start from the same pixel, turned by equal parts of a full
        circle. Then step through the jumps.
      </p>
      <PlaneStage
        bounds={BOUNDS}
        label={`Mandelbar set for power ${power} with ${power + 1} matching routes.`}
        paint={(image) => paintSet(image, power)}
        paintKey={power}
        onPick={(x, y) => setC({ x, y })}
      >
        {routes.map((route, copy) => {
          const start = rotatePoint(c, copy / (power + 1));
          const visible = route.slice(0, shown + 1);
          return (
            <g key={COLORS[copy]}>
              <path
                d={visible.map((p, i) => `${i ? "L" : "M"}${fixed(p.x)} ${fixed(-p.y)}`).join("")}
                fill="none"
                stroke={COLORS[copy]}
                strokeWidth={0.018}
                strokeLinejoin="round"
              />
              <circle
                cx={fixed(start.x)}
                cy={fixed(-start.y)}
                r={0.055}
                fill={COLORS[copy]}
                stroke="#10151a"
                strokeWidth={0.012}
              />
              {visible.slice(1).map((p, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: A route's points keep their order.
                <circle key={i} cx={fixed(p.x)} cy={fixed(-p.y)} r={0.028} fill={COLORS[copy]} />
              ))}
            </g>
          );
        })}
      </PlaneStage>
      <div className={motion.readout} aria-live="polite">
        Power {power} · {power + 1} matching routes · Jump {shown}
      </div>
      <LessonSteps
        step={shown}
        max={longest}
        onChange={setStep}
        label="Mandelbar route"
        stepDescription={`Jump ${shown} of ${longest}`}
      />
      <label className={styles.parameter}>
        <span>
          Power
          <output>{power}</output>
        </span>
        <input
          type="range"
          aria-label="Power"
          min={2}
          max={6}
          value={power}
          onChange={(event) => setPower(Number(event.target.value))}
        />
      </label>
    </LessonFrame>
  );
}
