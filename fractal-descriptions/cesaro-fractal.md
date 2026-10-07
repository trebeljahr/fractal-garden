# Cesàro Fractal

The Cesàro Fractal is a close relative of the [Koch Snowflake](/l-system/koch-snowflake). The Koch curve replaces the middle third of every line with the two sides of a triangle that sticks out at $60°$. The Cesàro curve does the same thing, but lets the spike open at any angle $\alpha$ between $60°$ and $90°$. The bigger the angle, the deeper and thinner the spikes get, until neighbouring spikes almost touch.

It is named after the Italian mathematician Ernesto Cesàro, who studied these curves in 1905. What you see here is the "antisnowflake" arrangement: four Cesàro curves sit on the sides of a square, with all spikes pointing inward. At $85°$ the inside of the square fills up with a dense, leaf-like pattern. Drag the angle down to $60°$ and you get the inward version of the Koch curve again.

Each step replaces a line with 4 copies. Each copy is shorter by a factor $2(1 + \cos\alpha)$, so the Hausdorff dimension depends on the angle:

$$
D = \frac{\ln 4}{\ln\left(2(1 + \cos\alpha)\right)}
$$

At $\alpha = 60°$ this is $\ln 4 / \ln 3 \approx 1.26$, the same as the Koch Snowflake. At the default $85°$ it is about $1.78$, and as $\alpha$ approaches $90°$ the dimension approaches $2$: the curve starts to fill the plane.

The page draws it as an [L-System](https://en.wikipedia.org/wiki/L-system) with these rules:

```ts
const AXIOM = "FLFLFLF"; // L = fixed 90° corner of the square
const RULES = { F: "F+F--F+F" }; // + and - turn by the adjustable angle
```

Every iteration is traced with unit-length steps and then scaled to fit the screen, so changing the angle needs no other adjustment. For other square variants of the Koch idea, see the [Quadratic Snowflake](/l-system/quadratic-snowflake), the [Minkowski Sausage](/l-system/minkowski-sausage) and the [Quadratic Koch Island](/l-system/quadratic-koch-island).
