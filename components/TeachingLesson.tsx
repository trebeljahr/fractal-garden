import dynamic from "next/dynamic";

// Load a lesson only on the pages that include its figure marker.
const DragonFoldLesson = dynamic(() => import("./lessons/DragonFoldLesson"));
const HilbertJoinLesson = dynamic(() => import("./lessons/HilbertJoinLesson"));
const KochMeasurementLesson = dynamic(() => import("./lessons/KochMeasurementLesson"));
const DlaContactsLesson = dynamic(() => import("./lessons/DlaContactsLesson"));
const LinkedJuliaLesson = dynamic(() => import("./lessons/LinkedJuliaLesson"));
const JuliaAttractorLesson = dynamic(() => import("./lessons/JuliaAttractorLesson"));
const SquareLineLesson = dynamic(() => import("./lessons/SquareLineLesson"));
const OrbitPlaneLesson = dynamic(() => import("./lessons/OrbitPlaneLesson"));
const PaintLesson = dynamic(() => import("./lessons/PaintLesson"));
const EscapeNeckLesson = dynamic(() => import("./lessons/EscapeNeckLesson"));
const JuliaMapLesson = dynamic(() => import("./lessons/JuliaMapLesson"));
const MandelbrotJuliaZoomLesson = dynamic(() => import("./lessons/MandelbrotJuliaZoomLesson"));
const StepLimitLesson = dynamic(() => import("./lessons/StepLimitLesson"));
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
const MandelbarLesson = dynamic(() => import("./lessons/MandelbarLesson"));
const BarnsleyRadiusLesson = dynamic(() => import("./lessons/BarnsleyRadiusLesson"));
const PeanoFillLesson = dynamic(() => import("./lessons/PeanoFillLesson"));
const GosperIslandLesson = dynamic(() => import("./lessons/GosperIslandLesson"));
const StarFractalLesson = dynamic(() => import("./lessons/StarFractalLesson"));
const LevyTapestryLesson = dynamic(() => import("./lessons/LevyTapestryLesson"));
const CircleGhostLesson = dynamic(() => import("./lessons/CircleGhostLesson"));
const MiraLesson = dynamic(() => import("./lessons/MiraLesson"));
const MirrorPairLesson = dynamic(() => import("./lessons/MirrorPairLesson"));

const LESSONS = [
  "linked-julia",
  "julia-attractor",
  "square-line",
  "orbits-squaring",
  "orbits-adding",
  "paint-mandelbrot",
  "escape-neck",
  "julia-map",
  "mandelbrot-julia-zoom",
  "step-limit-mandelbrot",
  "step-limit-julia",
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
  "mandelbar-turns",
  "barnsley-radius",
  "peano-fill",
  "gosper-island",
  "star-fractal",
  "levy-tapestry",
  "circle-ghosts",
  "mira",
  "mirror-pair",
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
    case "julia-attractor":
      return <JuliaAttractorLesson />;
    case "square-line":
      return <SquareLineLesson />;
    case "orbits-squaring":
      return <OrbitPlaneLesson adding={false} />;
    case "orbits-adding":
      return <OrbitPlaneLesson adding />;
    case "paint-mandelbrot":
      return <PaintLesson />;
    case "escape-neck":
      return <EscapeNeckLesson />;
    case "julia-map":
      return <JuliaMapLesson />;
    case "mandelbrot-julia-zoom":
      return <MandelbrotJuliaZoomLesson />;
    case "step-limit-mandelbrot":
      return <StepLimitLesson formula="mandelbrot" />;
    case "step-limit-julia":
      return <StepLimitLesson formula="julia" />;
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
    case "mandelbar-turns":
      return <MandelbarLesson />;
    case "barnsley-radius":
      return <BarnsleyRadiusLesson />;
    case "peano-fill":
      return <PeanoFillLesson />;
    case "gosper-island":
      return <GosperIslandLesson />;
    case "star-fractal":
      return <StarFractalLesson />;
    case "levy-tapestry":
      return <LevyTapestryLesson />;
    case "circle-ghosts":
      return <CircleGhostLesson />;
    case "mira":
      return <MiraLesson />;
    case "mirror-pair":
      return <MirrorPairLesson />;
  }
}
