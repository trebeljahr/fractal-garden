# Terdragon

The Terdragon is the three-fold cousin of the [Dragon Curve](/l-system/dragon-curve). Where the Heighway dragon replaces each segment with two segments at a right angle, the Terdragon replaces each segment with three segments joined by 120° turns. The result is a curve that folds into a field of interlocking triangles and hexagons.

This fractal uses a single-symbol [L-system](https://en.wikipedia.org/wiki/L-system):

```ts
const terdragon = {
  axiom: "F",
  replace: {
    F: "F+F-F",
  },
  angle: 120,
};
```

`F` means "draw forward one step", while `+` and `-` turn the drawing direction by 120° counter-clockwise and clockwise. After each iteration the curve has three times as many segments, and the distance from start to end grows by a factor of $\sqrt{3}$.

So the Terdragon is made of $N = 3$ copies of itself, each scaled by $r = \frac{1}{\sqrt{3}}$. Its similarity dimension is

$$
D = \frac{\log N}{\log (1/r)} = \frac{\log 3}{\log \sqrt{3}} = 2,
$$

which makes it a space-filling curve: in the limit it covers a region of the plane. It touches itself at many points, but it never draws the same segment twice. The boundary of that region is a fractal of its own, with dimension $\frac{\log 4}{\log 3} \approx 1.2619$, the same as the Koch curve.

You can compare it with the [Twindragon](/l-system/twindragon), which joins two Heighway dragons into a tile, and with the [Lévy Curve](/l-system/levy-curve), another curve built from a simple folding rule.
