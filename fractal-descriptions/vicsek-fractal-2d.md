# 2D Vicsek Fractal

Divide a square into a three-by-three grid. Keep the center square and four others, then remove the rest. Repeat inside all five remaining squares.<sup><a id="vicsek-fractal-2d-ref-1" href="#vicsek-fractal-2d-source-1">1</a></sup>

The **diagonal cross** keeps the four corners. The **Greek cross** keeps the four squares next to the center, making a plus sign.

<figure data-construction-player="vicsek-fractal-2d"></figure>

In the diagonal cross, squares touch only at corners. Raise the level and watch the count: 5 squares joined at 4 corners, 25 at 24, 125 at 124.<sup><a id="vicsek-fractal-2d-ref-2" href="#vicsek-fractal-2d-source-2">2</a></sup> Each level keeps the old joins, because the new corner squares still touch there, and adds four new joins inside every old square.

Holding 125 squares together takes at least 124 joins, one for each square after the first. A loop would make one of those joins spare, and here none is, so the shape never closes a loop. Between any two squares there is exactly one route that does not double back. Take out a square in the middle of a route and nothing else connects its two ends.

<figure data-lesson="vicsek-joins"></figure>

Point at or tap any square to take it out. Only a square at the end of a branch leaves one piece. Take one square out of the [Sierpinski carpet](/sierpinski-carpet) and the rest still holds together, because a route can go around the gap.

The Greek cross has the same joins through its shared sides. Its squares also touch at some corners, but the next level removes those corners. In the infinite limit it is the same shape: rotate the diagonal version by 45 degrees and scale it by $1/\sqrt2$.

No loop also means no gap is walled in, so one line can trace around all the squares without lifting. For the diagonal cross, that line is the [quadratic snowflake](/l-system/quadratic-snowflake) started from one step per side.

The [3D version](/vicsek-fractal-3d) casts the plus-shaped pattern as its straight-on shadow.

## Further exploring

- [Vicsek fractal — Wikipedia](https://en.wikipedia.org/wiki/Vicsek_fractal)
- [Box fractal — MathWorld](https://mathworld.wolfram.com/BoxFractal.html)
- [Greek Cross Fractal — Robert Dickau](https://www.robertdickau.com/greekcross.html)

## Sources and notes

1. <span id="vicsek-fractal-2d-source-1"></span> John E. Hutchinson, [Fractals and Self-Similarity](https://maths-people.anu.edu.au/~john/Assets/Research%20Papers/fractals_self-similarity.pdf), Indiana University Mathematics Journal 30 (1981), 713–747, §3.1. Background on sets formed by repeatedly taking smaller copies. [Back](#vicsek-fractal-2d-ref-1)
2. <span id="vicsek-fractal-2d-source-2"></span> Calculation. Counted on this page's squares at levels 0 to 6: $5^n$ squares, $5^n-1$ joins, one connected piece. At levels 1 to 4, taking out any square leaves as many pieces as it has joins. At levels 1 to 3 of the carpet, joined along sides, taking out any square leaves one piece. [Back](#vicsek-fractal-2d-ref-2)
