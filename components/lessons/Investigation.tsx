import dynamic from "next/dynamic";
import { type GeometryLessonKind, isGeometryLessonKind } from "../../utils/lessons/geometryLessons";
import { isPathLessonKind, type PathLessonKind } from "../../utils/lessons/pathLessonInfo";

const PathLesson = dynamic(() => import("./PathLesson"));
const GeometryLesson = dynamic(() => import("./GeometryLesson"));
const SpecialLesson = dynamic(() => import("./SpecialLesson"));
const BuddhabrotConnection = dynamic(() => import("./BuddhabrotConnection"));
type SpecialKind = "buddhabrot" | "mandelbulb" | "rauzy";
export type InvestigationKind =
  | PathLessonKind
  | GeometryLessonKind
  | SpecialKind
  | "buddhabrot-connection";
export const isInvestigationKind = (value: unknown): value is InvestigationKind =>
  isPathLessonKind(value) ||
  isGeometryLessonKind(value) ||
  value === "buddhabrot" ||
  value === "buddhabrot-connection" ||
  value === "mandelbulb" ||
  value === "rauzy";
export default function Investigation({ kind }: { kind: InvestigationKind }) {
  if (kind === "buddhabrot-connection") return <BuddhabrotConnection />;
  if (isPathLessonKind(kind)) return <PathLesson kind={kind} />;
  if (isGeometryLessonKind(kind)) return <GeometryLesson kind={kind} />;
  return <SpecialLesson kind={kind} />;
}
