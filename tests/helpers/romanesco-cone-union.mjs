// Independent finite-construction oracle: flatten transforms, solve each cone's
// complete interval with direct quadratic roots, then merge sorted intervals.
const dot = (a, b) => a.reduce((sum, v, i) => sum + v * b[i], 0);
const apply = (axes, p) =>
  [0, 1, 2].map((i) => axes.reduce((sum, axis, j) => sum + axis[i] * p[j], 0));

export function finiteConeTree(children, level, root, growth = 1) {
  const nodes = [{ ...root, level: 0 }];
  for (let i = 0; i < nodes.length; i++) {
    const parent = nodes[i];
    if (parent.level >= level) continue;
    for (const child of children) {
      const offset = apply(parent.axes, child.center);
      nodes.push({
        center: parent.center.map((v, j) => v + offset[j]),
        axes: child.axes.map((axis) => apply(parent.axes, axis)),
        level: parent.level + 1,
      });
    }
  }
  return nodes
    .filter((n) => level === 0 || n.level !== level || growth > 0)
    .map((node) =>
      node.level !== level || level === 0 || growth === 1
        ? node
        : {
            ...node,
            center: node.center.map((v, i) => v + node.axes[1][i] * (growth - 1)),
            axes: node.axes.map((axis) => axis.map((v) => v * growth)),
          },
    );
}

export function finiteConeUnionExit(nodes, eye, ray, radius) {
  const intervals = [],
    k2 = (radius / 2) ** 2;
  for (const node of nodes) {
    const s2 = dot(node.axes[0], node.axes[0]);
    const origin = eye.map((v, i) => v - node.center[i]);
    const o = node.axes.map((axis) => dot(axis, origin) / s2);
    const d = node.axes.map((axis) => dot(axis, ray) / s2);
    const a = d[0] ** 2 + d[2] ** 2 - k2 * d[1] ** 2;
    const b = 2 * (o[0] * d[0] + o[2] * d[2] + k2 * (1 - o[1]) * d[1]);
    const c = o[0] ** 2 + o[2] ** 2 - k2 * (1 - o[1]) ** 2;
    const roots = [];
    const discriminant = b * b - 4 * a * c;
    if (Math.abs(a) < 1e-14) {
      if (Math.abs(b) > 1e-14) roots.push(-c / b);
    } else if (discriminant >= 0) {
      roots.push(
        (-b - Math.sqrt(discriminant)) / (2 * a),
        (-b + Math.sqrt(discriminant)) / (2 * a),
      );
    }
    const candidates = roots.filter((t) => o[1] + t * d[1] >= -1 && o[1] + t * d[1] <= 1);
    if (Math.abs(d[1]) > 1e-14) {
      const base = (-1 - o[1]) / d[1];
      if ((o[0] + base * d[0]) ** 2 + (o[2] + base * d[2]) ** 2 <= radius ** 2)
        candidates.push(base);
      const tip = (1 - o[1]) / d[1];
      if ((o[0] + tip * d[0]) ** 2 + (o[2] + tip * d[2]) ** 2 < 1e-24) candidates.push(tip);
    }
    if (candidates.length) intervals.push([Math.min(...candidates), Math.max(...candidates)]);
  }
  intervals.sort((a, b) => a[0] - b[0]);
  let end = 0;
  for (const [enter, leave] of intervals) {
    if (enter > end) break;
    end = Math.max(end, leave);
  }
  return end > 0 ? end : null;
}
