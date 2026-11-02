import dynamic from "next/dynamic";

// Load a lesson only on the pages that include its figure marker.
const DragonFoldLesson = dynamic(() => import("./lessons/DragonFoldLesson"));
const HilbertJoinLesson = dynamic(() => import("./lessons/HilbertJoinLesson"));
const KochMeasurementLesson = dynamic(() => import("./lessons/KochMeasurementLesson"));
const DlaContactsLesson = dynamic(() => import("./lessons/DlaContactsLesson"));
const LinkedJuliaLesson = dynamic(() => import("./lessons/LinkedJuliaLesson"));
const StepLimitLesson = dynamic(() => import("./lessons/StepLimitLesson"));
const HandJumpLesson = dynamic(() => import("./lessons/HandJumpLesson"));
const LSystemLesson = dynamic(() => import("./lessons/LSystemLesson"));
const DragonTilingLesson = dynamic(() => import("./lessons/DragonTilingLesson"));
const NewtonLesson = dynamic(() => import("./lessons/NewtonLesson"));
const LogisticLesson = dynamic(() => import("./lessons/LogisticLesson"));
const AttractorLesson = dynamic(() => import("./lessons/AttractorLesson"));
const DlaLesson = dynamic(() => import("./lessons/DlaLesson"));
const SierpinskiSeedsLesson = dynamic(() => import("./lessons/SierpinskiSeedsLesson"));
const ChaosGameLesson = dynamic(() =>
  import("./lessons/SierpinskiConnections").then((m) => m.ChaosGameLesson),
);
const PascalTriangleLesson = dynamic(() =>
  import("./lessons/SierpinskiConnections").then((m) => m.PascalTriangleLesson),
);
const CellularTriangleLesson = dynamic(() =>
  import("./lessons/SierpinskiConnections").then((m) => m.CellularTriangleLesson),
);
const PenroseLesson = dynamic(() => import("./lessons/PenroseLesson"));

const LESSONS = [
  "linked-julia",
  "step-limit-mandelbrot",
  "step-limit-julia",
  "julia-by-hand",
  "koch-measurement",
  "dragon-fold",
  "hilbert-join",
  "dla-contacts",
  "lsystem-koch",
  "lsystem-dragon",
  "dragon-tiling",
  "lsystem-hilbert",
  "newton",
  "logistic",
  "lorenz",
  "rossler",
  "dla",
  "penrose",
  "sierpinski-seeds",
  "sierpinski-chaos",
  "sierpinski-pascal",
  "sierpinski-cells",
] as const;
export type TeachingLessonKind = (typeof LESSONS)[number];
export function isTeachingLessonKind(value: unknown): value is TeachingLessonKind {
  return typeof value === "string" && (LESSONS as readonly string[]).includes(value);
}

export default function TeachingLesson({ kind }: { kind: TeachingLessonKind }) {
  switch (kind) {
    case "dragon-fold":
      return <DragonFoldLesson />;
    case "hilbert-join":
      return <HilbertJoinLesson />;
    case "koch-measurement":
      return <KochMeasurementLesson />;
    case "dla-contacts":
      return <DlaContactsLesson />;
    case "linked-julia":
      return <LinkedJuliaLesson />;
    case "step-limit-mandelbrot":
      return <StepLimitLesson formula="mandelbrot" />;
    case "step-limit-julia":
      return <StepLimitLesson formula="julia" />;
    case "julia-by-hand":
      return <HandJumpLesson />;
    case "lsystem-koch":
      return <LSystemLesson preset="koch" />;
    case "lsystem-dragon":
      return <LSystemLesson preset="dragon" />;
    case "dragon-tiling":
      return <DragonTilingLesson />;
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
    case "sierpinski-seeds":
      return <SierpinskiSeedsLesson />;
    case "sierpinski-chaos":
      return <ChaosGameLesson />;
    case "sierpinski-pascal":
      return <PascalTriangleLesson />;
    case "sierpinski-cells":
      return <CellularTriangleLesson />;
    case "penrose":
      return <PenroseLesson />;
  }
}
