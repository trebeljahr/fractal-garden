# H Tree

The H Tree is about as simple as a fractal can get. Draw a horizontal line. At both of its ends, draw a vertical line, centered on that end and a little shorter. At the four new ends, draw horizontal lines again, and so on. After two steps you see a big letter H, and every tip of that H sprouts a smaller H, forever.

The magic number is the shrink factor. Each new generation is shorter by

$$
r = \frac{1}{\sqrt{2}} \approx 0.7071
$$

so that two steps (one horizontal, one vertical) halve the length. With exactly this ratio the shape never overlaps itself, yet it comes arbitrarily close to every point of a rectangle with side ratio $\sqrt{2} : 1$ – the same shape as an A4 sheet of paper. The limit fills that rectangle, so its Hausdorff dimension is

$$
D = \frac{\log 4}{\log 2} = 2.
$$

Push the ratio slider above $1/\sqrt{2}$ and the branches start to cross each other. Go below it and the tree thins out into a dust of tiny H shapes.

The H Tree is not only pretty. Chip designers use it to route clock signals: every tip is the same distance from the center, so a signal sent from the middle reaches all of them at the same time. Antenna designers use it for compact antennas too.

You may have noticed that the [Fractal Canopy](/fractal-canopy) has an H-Tree preset. A canopy with two branches at $180°$ is exactly this construction. It is also a close cousin of the [Pythagoras Tree](/pythagoras-tree), which branches in the same binary way but with squares and triangles. And the [T-Square Fractal](/t-square-fractal) does the same "put a smaller copy at every corner" trick with filled squares instead of lines.

The drawing code is a tiny recursion:

```ts
const grow = (x, y, length, horizontal, depth) => {
  const [x0, y0, x1, y1] = horizontal
    ? [x - length / 2, y, x + length / 2, y]
    : [x, y - length / 2, x, y + length / 2];

  drawLine(x0, y0, x1, y1);
  if (depth >= iterations) return;

  grow(x0, y0, length * ratio, !horizontal, depth + 1);
  grow(x1, y1, length * ratio, !horizontal, depth + 1);
};
```
