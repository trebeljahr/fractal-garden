# Koch Snowflake

Look along the snowflake's edge for a triangular bump. Each side of that bump carries smaller bumps with the same shape. Repeating this replacement creates the jagged boundary.

## Replace one straight edge

Divide an edge into three equal parts. Replace the middle part with the other two sides of an outward equilateral triangle. Four shorter segments now join the original endpoints.

<figure data-construction="koch"></figure>

The diagram follows one edge. The full snowflake applies the same replacement to all three edges of an equilateral triangle. In the explorer, pause **Animate growth** and change **Iterations** to compare stages. The first displayed iteration is the starting triangle.

## A longer boundary inside a bounded shape

Each replacement multiplies the number of segments by four and divides their length by three. The perimeter after $n$ replacements is:

$$
P_n = P_0\left(\frac{4}{3}\right)^n
$$

The perimeter grows without bound. The added triangles get smaller quickly enough that the enclosed area approaches a finite limit. Every stage you see on screen has a finite perimeter.

The [Harvey Mudd explanation](https://math.hmc.edu/funfacts/koch-snowflake/) follows the area and perimeter calculations. The [Koch anti-snowflake](/l-system/koch-anti-snowflake) turns the bumps inward. The [Cesàro fractal](/l-system/cesaro-fractal) changes their angle.

## How the drawing instructions repeat

This page uses an L-system. **F** means draw forward. The symbols **+** and **−** turn by 60 degrees in opposite directions. Each replacement expands a forward instruction into:

```text
F → F-F++F-F
```

The [L-system explorer](/l-system/explorer) lets you edit rules and compare the resulting paths.
