# Koch Snowflake

Replace the middle third of a segment with two sides of an outward equilateral triangle. Four segments, each one-third as long, now connect the old endpoints. Apply the rule to all three sides of an equilateral triangle.

<figure data-construction="koch"></figure>

After $n$ replacements, a starting side length $s$ gives $3\cdot4^n$ segments of length $s/3^n$. Thus

$$
P_n=3s(4/3)^n.
$$

The perimeter diverges. The added area converges.<sup><a id="koch-snowflake-ref-1" href="#koch-snowflake-source-1">1</a></sup> If $A_0$ is the original triangle's area, round $n\ge1$ adds $3\cdot4^{n-1}$ triangles, each with area $A_0/9^n$. Summing gives

$$
A_n=A_0\left[\frac85-\frac35\left(\frac49\right)^n\right].
$$

The limiting snowflake therefore encloses exactly $8/5$ of the starting area. Its boundary has dimension $\log4/\log3\approx1.262$. The filled region has dimension $2$. Every displayed stage still has a finite polygonal perimeter.

## Draw the rule as a sentence

The L-system uses **F** to draw and **+** or **−** to turn by 60 degrees:

```text
F → F-F++F-F
```

<figure data-lesson="lsystem-koch"></figure>

The two adjacent turns at a tip change heading by 120 degrees. Edit this rule in the [L-system explorer](/l-system/explorer). The [anti-snowflake](/l-system/koch-anti-snowflake) reverses the bumps, while the [Cesàro fractal](/l-system/cesaro-fractal) changes their angle.

A cube can produce the same outline. Remove its eight corner thirds recursively, then project along a body diagonal. The [Mosely snowflake](/mosely-snowflake) approaches a Koch silhouette because overlapping cube shadows form the corresponding hexagonal construction.<sup><a id="koch-snowflake-ref-2" href="#koch-snowflake-source-2">2</a></sup> This exact relationship uses parallel viewing rays.

## Sources and notes

1. <span id="koch-snowflake-source-1"></span> Francis Su and collaborators, [Koch Snowflake](https://math.hmc.edu/funfacts/koch-snowflake/), Harvey Mudd College, Math Fun Facts. Perimeter and geometric-series area argument; the formulas above expand that calculation. [Back](#koch-snowflake-ref-1)
2. <span id="koch-snowflake-source-2"></span> Eric Baird, [The Impossible Snowflake](https://alt-fractals.blogspot.com/2011/04/impossible-snowflake.html), 30 April 2011. Corner-removal cube construction and Koch silhouette. [Back](#koch-snowflake-ref-2)
