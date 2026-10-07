# Minkowski Sausage

The Minkowski Sausage is the "quadratic type 2" variant of the [Koch Snowflake](/l-system/koch-snowflake) curve, named after Hermann Minkowski. Where the Koch curve uses triangles, this one uses only right angles. Every line is cut into 4 equal parts and replaced with 8 segments that step up, across, down, down, across and back up again, like a square wave. Repeat that on every segment and the line turns into a thick, wriggling band: the sausage.

Turn on the "Minkowski island" toggle to put four of these curves on the sides of a square. Because every bump outward is matched by a bump inward of the same size, the island always encloses exactly the area of the square you started with, while its boundary grows longer with every step.

Each step replaces a line with 8 copies, each $\frac{1}{4}$ as long. The Hausdorff dimension is therefore

$$
D = \frac{\ln 8}{\ln 4} = \frac{3}{2} = 1.5
$$

This is a little higher than the [Quadratic Snowflake](/l-system/quadratic-snowflake), which uses the "quadratic type 1" curve with 5 segments of $\frac{1}{3}$ (dimension $\ln 5 / \ln 3 \approx 1.46$).

The page draws it as an [L-System](https://en.wikipedia.org/wiki/L-system) with a turn angle of $90°$ and these rules:

```ts
const SAUSAGE_AXIOM = "F";
const ISLAND_AXIOM = "F+F+F+F";
const RULES = { F: "F+F-F-FF+F+F-F" };
```

For more curves from the same family, see the [Quadratic Koch Island](/l-system/quadratic-koch-island) and the [Cesàro Fractal](/l-system/cesaro-fractal).
