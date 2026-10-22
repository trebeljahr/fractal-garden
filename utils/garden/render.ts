import type { Dimension } from "../lsystem/spec";
import type { BuiltPlant, Plant } from "./model";

export type Camera = { yaw: number; pitch: number; zoom: number };
export const DEFAULT_CAMERA: Camera = { yaw: -0.28, pitch: 0.32, zoom: 1 };
export type GardenView = {
  dimension: Dimension;
  camera: Camera;
  growth: number;
  selected: number | null;
  wind: boolean;
};
export type Hit = { id: number; x: number; y: number; top: number; radius: number };

export function projection(width: number, height: number, view: GardenView) {
  const scale = Math.min(width / 10.8, height / 6.2) * view.camera.zoom;
  const spatial = view.dimension === "3d";
  const yaw = spatial ? view.camera.yaw : 0;
  const pitch = spatial ? view.camera.pitch : 0;
  const cy = Math.cos(yaw),
    sy = Math.sin(yaw),
    cp = Math.cos(pitch),
    sp = Math.sin(pitch);
  const origin = height * (spatial ? 0.57 : 0.79);
  return {
    scale,
    point(x: number, y: number, z: number) {
      if (!spatial)
        return {
          x: width / 2 + x * scale,
          y: origin - y * scale + z * scale * 0.09,
          depth: z,
          scale,
        };
      const rx = x * cy + z * sy;
      const rz = -x * sy + z * cy;
      const ry = y - 1.6;
      const depth = rz * cp + ry * sp;
      const perspective = 14 / Math.max(3, 14 - depth);
      return {
        x: width / 2 + rx * scale * perspective,
        y: origin - (ry * cp - rz * sp) * scale * perspective,
        depth,
        scale: scale * perspective,
      };
    },
    ground(screenX: number, screenY: number, oldZ: number): [number, number] {
      if (!spatial) return [Math.max(-4.5, Math.min(4.5, (screenX - width / 2) / scale)), oldZ];
      // Intersect the camera ray with y=0; same perspective as point().
      const u = (screenX - width / 2) / scale;
      const v = (origin - screenY) / scale;
      const ry = -1.6;
      const rz = (ry * cp - v + (v * ry * sp) / 14) / (sp - (v * cp) / 14 || 0.001);
      const depth = rz * cp + ry * sp;
      const rx = (u * (14 - depth)) / 14;
      return [
        Math.max(-4.5, Math.min(4.5, rx * cy - rz * sy)),
        Math.max(-3, Math.min(3, rx * sy + rz * cy)),
      ];
    },
  };
}

function shades(hex: string) {
  const rgb = [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));
  return [0.45, 0.6, 0.75, 0.9, 1, 1.12].map(
    (factor) => `rgb(${rgb.map((n) => Math.min(255, Math.round(n * factor))).join(",")})`,
  );
}

type Mark = {
  depth: number;
  kind: "branch" | "leaf";
  x: number;
  y: number;
  x2: number;
  y2: number;
  size: number;
  turn: number;
  color: string;
  alpha: number;
};

export function drawGarden(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  plants: BuiltPlant[],
  view: GardenView,
  time = 0,
): Hit[] {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#0d1716";
  ctx.fillRect(0, 0, width, height);
  const light = ctx.createRadialGradient(
    width * 0.48,
    height * 0.35,
    0,
    width * 0.5,
    height * 0.5,
    Math.max(width, height) * 0.7,
  );
  light.addColorStop(0, "#1d3029");
  light.addColorStop(1, "#0a1213");
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, width, height);
  const project = projection(width, height, view);
  const point = project.point;
  const spatial = view.dimension === "3d";

  // A quiet planting bed establishes scale and makes the orbit readable.
  if (spatial) {
    ctx.beginPath();
    for (let i = 0; i <= 100; i++) {
      const a = (i / 100) * Math.PI * 2;
      const p = point(Math.cos(a) * 4.5, -0.035, Math.sin(a) * 3.2);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.fillStyle = "#16231e";
    ctx.fill();
    ctx.strokeStyle = "#344437";
    ctx.lineWidth = 1;
    ctx.stroke();
    for (let x = -4; x <= 4; x += 0.5) {
      for (let z = -3; z <= 3; z += 0.5) {
        if ((x * x) / 20.25 + (z * z) / 10.24 > 1) continue;
        const p = point(x, 0, z);
        ctx.fillStyle = "#3c4c3b";
        ctx.fillRect(p.x, p.y, 1, 1);
      }
    }
  } else {
    const y = point(0, 0, 0).y;
    const ground = ctx.createLinearGradient(0, y - 10, 0, height);
    ground.addColorStop(0, "#25332500");
    ground.addColorStop(0.25, "#25332555");
    ground.addColorStop(1, "#0d171600");
    ctx.fillStyle = ground;
    ctx.fillRect(0, y - 10, width, height - y + 10);
    ctx.strokeStyle = "#50604a55";
    ctx.beginPath();
    ctx.moveTo(width * 0.06, y + 16);
    ctx.lineTo(width * 0.94, y + 16);
    ctx.stroke();
  }

  const marks: Mark[] = [];
  const hits: Hit[] = [];
  const ordered = [...plants].sort((a, b) => a.plant.z - b.plant.z);
  for (const built of ordered) {
    const { plant, geometry, leaves, births, ends, height: plantHeight } = built;
    const scale = plant.size / plantHeight;
    const turn = (plant.rotation * Math.PI) / 180;
    const ct = Math.cos(turn),
      st = Math.sin(turn);
    const colors = shades(plant.color);
    const transform = (x: number, y: number, z: number) => {
      // Rotate in the planting plane in 3D; lean in the elevation in 2D.
      let wx = spatial ? (x * ct + z * st) * scale : (x * ct + y * st) * scale;
      const wy = spatial ? y * scale : (y * ct - x * st) * scale;
      const wz = spatial ? (-x * st + z * ct) * scale : z * scale;
      if (view.wind) wx += Math.sin(time * 0.001 + plant.seed + wy * 0.8) * wy * wy * 0.004;
      return point(wx + plant.x, wy, wz + plant.z);
    };
    const root = point(plant.x, 0, plant.z);
    const top = transform(0, plantHeight, 0);
    hits.push({
      id: plant.id,
      x: root.x,
      y: root.y,
      top: top.y,
      radius: Math.max(20, plant.size * project.scale * 0.24),
    });

    for (let i = 0; i < geometry.count; i++) {
      if (births[i] * 0.82 >= view.growth) continue;
      const o = i * 6;
      const { positions } = geometry;
      const fraction = Math.min(
        1,
        (view.growth - births[i] * 0.82) / Math.max(0.001, (ends[i] - births[i]) * 0.82),
      );
      const a = transform(positions[o], positions[o + 1], positions[o + 2]);
      const b = transform(
        positions[o] + (positions[o + 3] - positions[o]) * fraction,
        positions[o + 1] + (positions[o + 4] - positions[o + 1]) * fraction,
        positions[o + 2] + (positions[o + 5] - positions[o + 2]) * fraction,
      );
      const width = Math.max(0.65, geometry.widths[i] * plant.size * 0.018 * a.scale);
      marks.push({
        depth: spatial ? (a.depth + b.depth) / 2 : plant.z,
        kind: "branch",
        x: a.x,
        y: a.y,
        x2: b.x,
        y2: b.y,
        size: width,
        turn: 0,
        color:
          plant.species === "fern" ? colors[3] : geometry.widths[i] > 0.35 ? "#887b58" : colors[1],
        alpha: spatial ? 0.95 : 0.82,
      });
    }
    for (let i = 0; i < leaves.length; i++) {
      const leaf = leaves[i];
      const growth = Math.min(1, Math.max(0, (view.growth - leaf.birth * 0.82) / 0.15));
      if (growth === 0) continue;
      const p = transform(leaf.x, leaf.y, leaf.z);
      marks.push({
        depth: spatial ? p.depth : plant.z + 0.001,
        kind: "leaf",
        x: p.x,
        y: p.y,
        x2: 0,
        y2: 0,
        size: Math.max(0.7, leaf.size * scale * p.scale * growth),
        turn: leaf.turn + (spatial ? view.camera.yaw : turn),
        color: leaf.flower ? (i % 2 ? "#e0b9a3" : "#ba8c80") : colors[i % colors.length],
        alpha: 0.92,
      });
    }
  }
  marks.sort((a, b) => a.depth - b.depth);
  ctx.lineCap = "round";
  for (const mark of marks) {
    ctx.globalAlpha = mark.alpha;
    if (mark.kind === "branch") {
      ctx.strokeStyle = mark.color;
      ctx.lineWidth = mark.size;
      ctx.beginPath();
      ctx.moveTo(mark.x, mark.y);
      ctx.lineTo(mark.x2, mark.y2);
      ctx.stroke();
    } else {
      ctx.fillStyle = mark.color;
      ctx.beginPath();
      ctx.ellipse(mark.x, mark.y, mark.size, mark.size * 0.43, mark.turn, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  for (const hit of hits) {
    const selected = hit.id === view.selected;
    ctx.strokeStyle = selected ? "#d1df9b" : "#76816b66";
    ctx.fillStyle = selected ? "#c7d497" : "#75836b";
    ctx.lineWidth = selected ? 1.5 : 1;
    ctx.beginPath();
    ctx.ellipse(hit.x, hit.y + 6, selected ? 11 : 4, selected ? 4 : 2, 0, 0, Math.PI * 2);
    ctx.stroke();
    if (selected) {
      ctx.font = "10px Montserrat, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(String(hit.id).padStart(2, "0"), hit.x, hit.y + 26);
    }
  }
  return hits;
}

export function findPlant(hits: Hit[], x: number, y: number): number | null {
  const roots = hits.filter((hit) => Math.hypot(hit.x - x, hit.y - y) < 24);
  if (roots.length)
    return roots.sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y))[0].id;
  const candidates = hits.filter(
    (hit) => Math.abs(hit.x - x) < hit.radius && y >= hit.top - 20 && y <= hit.y + 16,
  );
  return candidates.sort((a, b) => Math.abs(a.x - x) - Math.abs(b.x - x))[0]?.id ?? null;
}

export function gardenSummary(plants: Plant[]) {
  return `${plants.length} specimen${plants.length === 1 ? "" : "s"} · ${new Set(plants.map((plant) => plant.species)).size} plant forms`;
}
