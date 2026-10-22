import dynamic from "next/dynamic";

// Load a lesson only on the pages that include its figure marker.
const LSystemLesson = dynamic(() => import("./lessons/LSystemLesson"));
const NewtonLesson = dynamic(() => import("./lessons/NewtonLesson"));
const LogisticLesson = dynamic(() => import("./lessons/LogisticLesson"));
const AttractorLesson = dynamic(() => import("./lessons/AttractorLesson"));
const DlaLesson = dynamic(() => import("./lessons/DlaLesson"));
const PenroseLesson = dynamic(() => import("./lessons/PenroseLesson"));

const LESSONS = [
  "lsystem-koch",
  "lsystem-dragon",
  "lsystem-hilbert",
  "newton",
  "logistic",
  "lorenz",
  "rossler",
  "dla",
  "penrose",
] as const;
export type TeachingLessonKind = (typeof LESSONS)[number];
export function isTeachingLessonKind(value: unknown): value is TeachingLessonKind {
  return typeof value === "string" && (LESSONS as readonly string[]).includes(value);
}

export default function TeachingLesson({ kind }: { kind: TeachingLessonKind }) {
  switch (kind) {
    case "lsystem-koch":
      return <LSystemLesson preset="koch" />;
    case "lsystem-dragon":
      return <LSystemLesson preset="dragon" />;
    case "lsystem-hilbert":
      return <LSystemLesson preset="hilbert" />;
    case "newton":
      return <NewtonLesson />;
    case "logistic":
      return <LogisticLesson />;
    case "lorenz":
      return <AttractorLesson system="lorenz" />;
    case "rossler":
      return <AttractorLesson system="rossler" />;
    case "dla":
      return <DlaLesson />;
    case "penrose":
      return <PenroseLesson />;
  }
}
