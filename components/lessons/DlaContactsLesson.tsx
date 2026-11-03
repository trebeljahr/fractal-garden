import { useMemo, useState } from "react";
import common from "../../styles/lessons/Lesson.module.css";
import {
  CONTACT_FORK,
  CONTACT_SIZE,
  contactExperiment,
  contactSummary,
} from "../../utils/lessons/dlaContacts";
import { LessonFrame, LessonSteps } from "./LessonFrame";

export default function DlaContactsLesson() {
  const [grow, setGrow] = useState(false);
  const [step, setStep] = useState(0);
  const walks = useMemo(() => contactExperiment(grow), [grow]);
  const released = step * 50;
  const { counts, stuck, discarded, unfinished } = useMemo(
    () => contactSummary(walks.slice(0, released)),
    [walks, released],
  );
  const last = walks[released - 1];
  const cells = Array.from(counts, (count, index) => ({
    x: index % CONTACT_SIZE,
    y: Math.floor(index / CONTACT_SIZE),
    count,
  })).filter((p) => p.count > 0);
  return (
    <LessonFrame title="Where do the particles land?" kind="dla-contacts">
      <div className={common.options}>
        <button
          type="button"
          aria-pressed={!grow}
          onClick={() => {
            setGrow(false);
            setStep(0);
          }}
        >
          Keep the fork still
        </button>
        <button
          type="button"
          aria-pressed={grow}
          onClick={() => {
            setGrow(true);
            setStep(0);
          }}
        >
          Let it grow
        </button>
      </div>
      <svg
        viewBox="0 0 440 440"
        role="img"
        aria-label={`${grow ? "Growing cluster" : "First contacts on a fixed fork"}: ${stuck} particles stuck from ${released} released`}
        data-contact-total={stuck}
        style={{ maxWidth: "54rem", marginInline: "auto" }}
      >
        <rect
          x="20"
          y="20"
          width="400"
          height="400"
          fill="none"
          stroke="#eee8ce30"
          strokeDasharray="3 5"
        />
        {cells.map((cell) => (
          <rect
            key={`${cell.x}:${cell.y}`}
            x={15 + cell.x * 10}
            y={15 + cell.y * 10}
            width="9"
            height="9"
            fill="#f5c56d"
            opacity={grow ? 0.85 : 0.22 + 0.78 * (1 - Math.exp(-cell.count / 5))}
          >
            <title>
              {cell.count} {cell.count === 1 ? "particle" : "particles"} at ({cell.x}, {cell.y})
            </title>
          </rect>
        ))}
        {CONTACT_FORK.map((cell) => (
          <rect
            key={`${cell.x}:${cell.y}`}
            x={15 + cell.x * 10}
            y={15 + cell.y * 10}
            width="9"
            height="9"
            fill="#eee8ce"
          />
        ))}
        {last?.status === "stuck" && (
          <circle
            cx={19.5 + last.end.x * 10}
            cy={19.5 + last.end.y * 10}
            r="8"
            fill="none"
            stroke="#5ec2b7"
            strokeWidth="2"
          />
        )}
      </svg>
      <LessonSteps
        key={String(grow)}
        label="DLA contacts"
        step={step}
        max={16}
        onChange={setStep}
        stepDescription={`${released} particles released`}
      />
      <p aria-live="polite" data-contact-accounting={`${stuck},${discarded},${unfinished}`}>
        {stuck} first contacts · {discarded} discarded · {unfinished} hit the move limit
      </p>
      <p>
        {grow ? "Amber: stuck particles" : "Brighter: more contacts"} · Teal ring: last particle, if
        it stuck
      </p>
    </LessonFrame>
  );
}
