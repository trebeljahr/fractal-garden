# Quadratic Koch Island

The Quadratic Koch Island is another square relative of the [Koch Snowflake](/l-system/koch-snowflake). It is one of the first examples in Prusinkiewicz and Lindenmayer's book *The Algorithmic Beauty of Plants*, where it shows how a turtle can draw an L-system.

The start is a square. Every side is cut into 6 equal parts and replaced with a path of 18 segments that only turns at right angles. The path bends outward and inward by the same amount, so the island keeps the area of the original square. Only its coastline gets longer and more ragged with every step. After a few iterations the outline looks like a map of an island with deep bays and narrow peninsulas.

Each step replaces a line with 18 copies, each $\frac{1}{6}$ as long. The Hausdorff dimension is

$$
D = \frac{\ln 18}{\ln 6} \approx 1.61
$$

That makes it rougher than the [Quadratic Snowflake](/l-system/quadratic-snowflake) ($\approx 1.46$) and the [Minkowski Sausage](/l-system/minkowski-sausage) ($1.5$).

The page draws it as an [L-System](https://en.wikipedia.org/wiki/L-system) with a turn angle of $90°$ and these rules:

```ts
const AXIOM = "F-F-F-F";
const RULES = { F: "F+FF-FF-F-F+F+FF-F-F+F+FF+FF-F" };
```

The number of segments grows by a factor of 18 per iteration, so the page stops at 4 iterations (about 420,000 segments).
