import { lessonWord, walkLessonWord } from "./lsystemLesson";

export type GridPoint = [number, number];
export function hilbertGrid(round: number): GridPoint[] {
  const states = walkLessonWord("hilbert", lessonWord("hilbert", round));
  const points: GridPoint[] = [
    [0, 0],
    ...states.flatMap((state) =>
      state.segment ? [[Math.round(state.point.x), Math.round(state.point.y)] as GridPoint] : [],
    ),
  ];
  const minX = Math.min(...points.map((p) => p[0])),
    minY = Math.min(...points.map((p) => p[1]));
  return points.map(([x, y]) => [x - minX, y - minY]);
}

export function hilbertChunks(
  round: number,
  rotations = [0, 0, 0, 0],
  reversed = [false, false, false, false],
) {
  const points = hilbertGrid(round),
    count = points.length / 4;
  return Array.from({ length: 4 }, (_, quadrant) => {
    const chunk = points.slice(quadrant * count, (quadrant + 1) * count);
    const cx = (Math.min(...chunk.map((p) => p[0])) + Math.max(...chunk.map((p) => p[0]))) / 2;
    const cy = (Math.min(...chunk.map((p) => p[1])) + Math.max(...chunk.map((p) => p[1]))) / 2;
    const moved = chunk.map(([x, y]): GridPoint => {
      let dx = x - cx,
        dy = y - cy;
      for (let i = 0; i < ((rotations[quadrant] % 4) + 4) % 4; i++) [dx, dy] = [-dy, dx];
      return [cx + dx, cy + dy];
    });
    return { points: reversed[quadrant] ? moved.reverse() : moved, center: [cx, cy] as GridPoint };
  });
}

export function hilbertLinks(chunks: { points: GridPoint[] }[]) {
  return chunks.slice(0, -1).map((chunk, i) => {
    const from = chunk.points[chunk.points.length - 1],
      to = chunks[i + 1].points[0];
    return { from, to, fits: Math.abs(from[0] - to[0]) + Math.abs(from[1] - to[1]) === 1 };
  });
}
