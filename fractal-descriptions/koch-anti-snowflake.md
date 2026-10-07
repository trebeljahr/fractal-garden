# Koch Anti-Snowflake

The Koch Anti-Snowflake is the [Koch Snowflake](/l-system/koch-snowflake) turned inside out. It starts with the same triangle and uses the same rule: cut every line into thirds and replace the middle third with the two sides of a smaller triangle. The only difference is the direction. Here every new triangle points into the shape instead of out of it.

The result looks like three snowflake-shaped holes eating into a triangle from its sides. The boundary is exactly as long as the boundary of the snowflake, and grows by a factor of $\frac{4}{3}$ with every step, so it is infinitely long in the limit. The area goes the other way. The snowflake grows to $\frac{8}{5}$ of the starting triangle, while the anti-snowflake shrinks to $\frac{2}{5}$ of it.

Each step replaces a line with 4 copies, each $\frac{1}{3}$ as long, so the Hausdorff dimension is the same as for the snowflake:

$$
D = \frac{\ln 4}{\ln 3} \approx 1.26
$$

The page draws it as an [L-System](https://en.wikipedia.org/wiki/L-system) with a turn angle of $60°$ and these rules:

```ts
const AXIOM = "F++F++F"; // triangle, drawn counterclockwise
const RULES = { F: "F+F--F+F" }; // spikes turn left, into the triangle
```

If you open the spike angle beyond $60°$ you get the [Cesàro Fractal](/l-system/cesaro-fractal). For a square version of the same idea, see the [Quadratic Snowflake](/l-system/quadratic-snowflake).
