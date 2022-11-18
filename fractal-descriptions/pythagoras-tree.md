# Pythagoras Tree

The Pythagoras Tree is constructed by starting with a square and attaching a right triangle to the top of it.
From there, add squares to the remaining two sides of the triangle. Repeat that process to generate the tree.

Given two points defining a square, we can generate the tree as follows:

```ts
function pythagorasTree(p1: Vec2D, p2: Vec2D, depth = 0) {
  const [x1, y1] = p1;
  const [x2, y2] = p2;

  const d: Vec2D = [y1 - y2, x2 - x1];

  // Determine remaining points of the square
  const p3 = Vector.sub(p2, d);
  const p4 = Vector.sub(p1, d);
  drawPoly([p1, p2, p3, p4], config.color);

  if (depth === config.iterations) return;

  // Determine tip of the triangle
  const p5 = thirdPoint(p3, p4);
  drawPoly([p3, p4, p5], config.color);

  // Repeat with the points on the triangle as new base
  drawBranch(p4, p5, depth + 1);
  drawBranch(p5, p3, depth + 1);
}
```

See also [Pythagoras Tree](<https://en.wikipedia.org/wiki/Pythagoras_tree_(fractal)>).
