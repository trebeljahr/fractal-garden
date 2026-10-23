type Point = [number, number];
type Edge = { from: Point; to: Point };

const pointKey = ([x, y]: Point) => `${x},${y}`;

// Put a square around each segment, with that segment as its diagonal.
// Work at twice the integer turtle coordinates so shared edges cancel exactly.
// The resulting polygons converge to the same set as the shrinking turtle path.
export function dragonTile(points: Point[]) {
  const edges = new Map<string, Edge>();
  const cells: Point[] = [];
  for (let i = 1; i < points.length; i++) {
    const [ax, ay] = points[i - 1].map(Math.round);
    const [bx, by] = points[i].map(Math.round);
    const dx = bx - ax;
    const dy = by - ay;
    cells.push([ax + bx, ay + by]);
    const square: Point[] = [
      [2 * ax, 2 * ay],
      [ax + bx - dy, ay + by + dx],
      [2 * bx, 2 * by],
      [ax + bx + dy, ay + by - dx],
    ];
    for (let side = 0; side < 4; side++) {
      const from = square[side];
      const to = square[(side + 1) % 4];
      const reverse = `${pointKey(to)}:${pointKey(from)}`;
      if (!edges.delete(reverse)) edges.set(`${pointKey(from)}:${pointKey(to)}`, { from, to });
    }
  }
  const outgoing = new Map<string, Point[]>();
  for (const { from, to } of Array.from(edges.values())) {
    const key = pointKey(from);
    const list = outgoing.get(key) ?? [];
    list.push(to);
    outgoing.set(key, list);
  }
  const [ex, ey] = points[points.length - 1].map(Math.round);
  const denominator = 2 * (ex * ex + ey * ey);
  const normalized = ([x, y]: Point): Point => [
    (x * ex + y * ey) / denominator,
    (y * ex - x * ey) / denominator,
  ];
  const coordinate = (point: Point) => normalized(point).join(",");
  let outline = "";
  for (const { from } of Array.from(edges.values())) {
    if (!outgoing.get(pointKey(from))?.length) continue;
    outline += `M${coordinate(from)}`;
    let next = outgoing.get(pointKey(from))?.pop();
    while (next) {
      outline += `L${coordinate(next)}`;
      next = outgoing.get(pointKey(next))?.pop();
    }
    outline += "Z";
  }
  const path = points
    .map(([x, y], i) => `${i ? "L" : "M"}${coordinate([2 * Math.round(x), 2 * Math.round(y)])}`)
    .join("");
  return { outline, path, centers: cells.map(normalized) };
}

// Four quarter-turned dragons at each point of the checkerboard lattice.
// Its translation vectors are (1, 1) and (1, -1); each group has area 2.
export function dragonGroups(radius: number) {
  const groups: { x: number; y: number; key: string }[] = [];
  for (let x = -radius; x <= radius; x++) {
    for (let y = -radius; y <= radius; y++) {
      if ((x + y) % 2 === 0) groups.push({ x, y, key: `${x}:${y}` });
    }
  }
  return groups;
}
