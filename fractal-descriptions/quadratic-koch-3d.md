# Quadratic Koch Surface

Put a small cube-shaped bump in the middle of every cube face. Now put smaller bumps on all the new faces. Keep going.

To make one bump, split a square into nine squares. Replace the middle square with the five exposed faces of a little cube.<sup><a id="quadratic-koch-3d-ref-1" href="#quadratic-koch-3d-source-1">1</a></sup>

<figure data-construction-player="quadratic-koch-3d"></figure>

Eight flat squares and five bump faces replace one old square. That makes thirteen new faces, each with one ninth of the old area.

So the total face area grows by $13/9$ each round. The bumps shrink, but their faces multiply fast enough that the area grows without end.

## How far can the bumps reach?

Follow a stack of bumps outward. Their heights are one third, one ninth, one twenty-seventh of the starting cube's width, and so on.

$$
\frac13+\frac19+\frac1{27}+\cdots=\frac12.
$$

Even an endless stack reaches only half a starting cube's width beyond its face. The whole shape fits inside a box twice as wide as the starting cube.

Neel Shrestha worked out how to fold this pattern in origami. A finite version can be assembled from paper.<sup><a href="#quadratic-koch-3d-source-1">1</a></sup>

The [Koch surface](/koch-surface) raises triangular pyramids instead. The [quadratic snowflake](/l-system/quadratic-snowflake) draws square bumps along a flat outline.

## Sources and notes

1. <span id="quadratic-koch-3d-source-1"></span> Neel Shrestha, [Creating Square Koch Surfaces Using Origami](https://archive.bridgesmathart.org/2024/bridges2024-567.pdf), Bridges 2024, pp. 567–572. Original folding method and thirteen-square generator. The face count, area growth and total bump height are calculations from this explorer’s generator. [Back](#quadratic-koch-3d-ref-1)
