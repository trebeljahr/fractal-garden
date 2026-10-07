import type { Context2D } from "../types";

export type ApollonianGasketParams = {
  iterations: number;
  background: string;
  color: string;
  fillCircles: boolean;
  strokeCircles: boolean;
  lineWidth: number;
  showOuterCircle: boolean;
};

type Circle = {
  x: number;
  y: number;
  bend: number;
  radius: number;
  depth: number;
};

const PADDING = 0.08;

function createCircle(x: number, y: number, bend: number, depth: number): Circle {
  return {
    x,
    y,
    bend,
    radius: Math.abs(1 / bend),
    depth,
  };
}

function reflectCircle(excluded: Circle, a: Circle, b: Circle, c: Circle, depth: number) {
  const bend = 2 * (a.bend + b.bend + c.bend) - excluded.bend;
  const weightedX = 2 * (a.bend * a.x + b.bend * b.x + c.bend * c.x) - excluded.bend * excluded.x;
  const weightedY = 2 * (a.bend * a.y + b.bend * b.y + c.bend * c.y) - excluded.bend * excluded.y;

  return createCircle(weightedX / bend, weightedY / bend, bend, depth);
}

function getInitialConfiguration() {
  const outer = createCircle(0, 0, -1, 0);
  const innerRadius = 2 * Math.sqrt(3) - 3;
  const innerBend = 1 / innerRadius;
  const centerDistance = 1 - innerRadius;
  const innerCircles = [...new Array(3)].map((_, index) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * index) / 3;
    return createCircle(
      centerDistance * Math.cos(angle),
      centerDistance * Math.sin(angle),
      innerBend,
      0,
    );
  });

  return [outer, ...innerCircles] as const;
}

function buildGasket(iterations: number) {
  const [outer, c1, c2, c3] = getInitialConfiguration();
  const circles = [outer, c1, c2, c3];

  const fillGap = (a: Circle, b: Circle, c: Circle, excluded: Circle, depth: number) => {
    if (depth > iterations) return;

    const next = reflectCircle(excluded, a, b, c, depth);
    circles.push(next);

    fillGap(next, b, c, a, depth + 1);
    fillGap(next, a, c, b, depth + 1);
    fillGap(next, a, b, c, depth + 1);
  };

  fillGap(c1, c2, c3, outer, 1);
  fillGap(outer, c2, c3, c1, 1);
  fillGap(outer, c1, c3, c2, 1);
  fillGap(outer, c1, c2, c3, 1);

  return circles;
}

export function drawApollonianGasket(
  ctx: Context2D,
  width: number,
  height: number,
  config: ApollonianGasketParams,
) {
  const scale = (Math.min(width, height) * (1 - 2 * PADDING)) / 2;
  const circles = buildGasket(config.iterations);

  // Group circles by depth and the alpha they are drawn with. Everything
  // shares one color, so the order of the groups does not change the result,
  // and circles of one depth never overlap each other (the mutually tangent
  // seed circles keep a path of their own each).
  type Group = { alpha: number; path: Path2D };
  const fills = new Map<string, Group>();
  const strokes = new Map<string, Group>();
  const pathFor = (groups: Map<string, Group>, depth: number, alpha: number) => {
    const key = `${depth}:${alpha}`;
    let group = groups.get(key);
    if (!group) {
      group = { alpha, path: new Path2D() };
      groups.set(key, group);
    }
    return group.path;
  };

  ctx.fillStyle = config.background;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = config.color;
  ctx.fillStyle = config.color;
  ctx.lineWidth = config.lineWidth;

  // Canvas ignores a globalAlpha above 1, so the deepest strokes (0.4 + 0.08 *
  // depth > 1) inherit the alpha set last. Track it to keep that look.
  let alpha = 1;
  let drawn = 0;
  for (let i = 0; i < circles.length; i++) {
    const circle = circles[i];

    if (!config.showOuterCircle && circle.bend < 0) {
      continue;
    }

    const x = width / 2 + circle.x * scale;
    const y = height / 2 + circle.y * scale;
    const radius = circle.radius * scale;
    const fill = config.fillCircles && circle.bend > 0;
    const fillAlpha = 0.12 + 0.08 * Math.min(circle.depth, 4);
    const strokeAlpha = circle.bend < 0 ? 0.9 : 0.4 + 0.08 * circle.depth;
    drawn++;

    if (circle.depth === 0) {
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      if (fill) {
        ctx.globalAlpha = fillAlpha;
        ctx.fill();
      }
      if (config.strokeCircles) {
        ctx.globalAlpha = strokeAlpha;
        ctx.stroke();
      }
      alpha = ctx.globalAlpha;
      continue;
    }

    if (fill) {
      alpha = fillAlpha;
      const path = pathFor(fills, circle.depth, alpha);
      path.moveTo(x + radius, y);
      path.arc(x, y, radius, 0, Math.PI * 2);
    }

    if (config.strokeCircles) {
      if (strokeAlpha <= 1) alpha = strokeAlpha;
      const path = pathFor(strokes, circle.depth, alpha);
      path.moveTo(x + radius, y);
      path.arc(x, y, radius, 0, Math.PI * 2);
    }
  }

  fills.forEach((group) => {
    ctx.globalAlpha = group.alpha;
    ctx.fill(group.path);
  });

  strokes.forEach((group) => {
    ctx.globalAlpha = group.alpha;
    ctx.stroke(group.path);
  });

  ctx.globalAlpha = 1;

  return drawn;
}
