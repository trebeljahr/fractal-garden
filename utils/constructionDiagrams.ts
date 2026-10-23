export type Point = { x: number; y: number };
export type Hole = Point & { size: number; depth: number };
export type Branch = { start: Point; end: Point; depth: number };

type TangentCircle = Point & { radius: number; bend: number; depth: number };

export function circleContacts(circle: TangentCircle, circles: TangentCircle[]): Point[] {
  return circles.flatMap((parent) => {
    if (parent.depth >= circle.depth) return [];
    const dx = parent.x - circle.x;
    const dy = parent.y - circle.y;
    const distance = Math.hypot(dx, dy);
    const gap = parent.bend < 0 ? parent.radius - circle.radius : parent.radius + circle.radius;
    if (!distance || Math.abs(distance - gap) > 1e-8) return [];
    const scale = (circle.radius / distance) * (parent.bend < 0 ? -1 : 1);
    return [{ x: circle.x + dx * scale, y: circle.y + dy * scale }];
  });
}

// Small, bounded diagrams use mathematical coordinates, independent of the
// fullscreen renderers' adaptive depth, camera and animation state.
export function carpetHoles(step: number): Hole[] {
  const holes: Hole[] = [];
  function cut(x: number, y: number, size: number, depth: number) {
    if (depth > step) return;
    const third = size / 3;
    holes.push({ x: x + third, y: y + third, size: third, depth });
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        if (row !== 1 || col !== 1) cut(x + col * third, y + row * third, third, depth + 1);
      }
    }
  }
  cut(0, 0, 1, 1);
  return holes;
}

export function kochEdge(step: number): Point[] {
  let points: Point[] = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
  ];
  for (let level = 0; level < step; level++) {
    const next: Point[] = [points[0]];
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1];
      const b = points[i];
      const dx = (b.x - a.x) / 3;
      const dy = (b.y - a.y) / 3;
      next.push(
        { x: a.x + dx, y: a.y + dy },
        {
          x: a.x + 1.5 * dx + (Math.sqrt(3) / 2) * dy,
          y: a.y + 1.5 * dy - (Math.sqrt(3) / 2) * dx,
        },
        { x: a.x + 2 * dx, y: a.y + 2 * dy },
        b,
      );
    }
    points = next;
  }
  return points;
}

export function canopyBranches(step: number, angle: number): Branch[] {
  const branches: Branch[] = [];
  function grow(start: Point, heading: number, length: number, depth: number) {
    const end = {
      x: start.x + Math.sin(heading) * length,
      y: start.y - Math.cos(heading) * length,
    };
    branches.push({ start, end, depth });
    if (depth === step) return;
    const spread = (angle * Math.PI) / 360;
    grow(end, heading - spread, length * 0.62, depth + 1);
    grow(end, heading + spread, length * 0.62, depth + 1);
  }
  grow({ x: 0, y: 0 }, 0, 1, 0);
  return branches;
}
