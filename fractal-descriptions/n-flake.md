# N-Flake

This construction replaces a polygon with smaller copies at its corners. A triangle has three corners, so it produces three copies. A pentagon produces five. Each copy is replaced in the same way on the next step.<sup><a id="n-flake-ref-1" href="#n-flake-source-1">1</a></sup>

<figure data-lesson="n-flake-outline"></figure>

The copies shrink until neighbors just touch. Triangle copies are half the original width. Pentagon copies are about 38% of the width, and hexagon copies are one third. The triangle version is the [Sierpinski triangle](/l-system/sierpinski-triangle).

The outline of the hexagon version is another fractal. Look at one side of the hexagon in round 1. Two corner copies lie along that side, each covering one third of it. They touch at a single point inside the hexagon, which leaves a triangular notch between them. So one straight line has become four lines, each one third as long. That is the rule of the [Koch curve](/l-system/koch-snowflake).

Each of those four lines is a side of a small hexagon, so round 2 does the same to all four. Each new notch points into its own small hexagon, so the notches stay on the same side of the line as you walk along it. The Koch rule keeps them on one side too.

The amber line is drawn from the Koch rule alone, with no information about the hexagons. It follows their outline in every round: 24 lines, then 96, then 384.<sup><a id="n-flake-ref-2" href="#n-flake-source-2">2</a></sup> Repeat forever and the six curves close up into a Koch snowflake, with its six largest points on the hexagon's corners.<sup><a id="n-flake-ref-3" href="#n-flake-source-3">3</a></sup>

**Center copy** adds another polygon between the corner copies. For squares, the four half-size corner squares already fill the original square. A fifth square in the center covers some of the same area again. For hexagons, the center copy fits between the six corner copies and fills a gap. It never reaches the outline, so the amber line stays the same with it or without it.

## Further exploring

- [Pentaflake — MathWorld](https://mathworld.wolfram.com/Pentaflake.html)
- [Sierpinski Pentagon — Larry Riddle](https://larryriddle.agnesscott.org/ifs/pentagon/pentagon.htm)

## Sources and notes

1. <span id="n-flake-source-1"></span> John E. Hutchinson, [Fractals and Self-Similarity](https://maths-people.anu.edu.au/~john/Assets/Research%20Papers/fractals_self-similarity.pdf), Indiana University Mathematics Journal 30 (1981), 713–747, §3.1. Background on sets formed by repeatedly taking smaller copies. [Back](#n-flake-ref-1)
2. <span id="n-flake-source-2"></span> Calculation. Exact coordinates from this page's generator, rounds 0 to 5, with and without the center copy. Round $n$ of the Koch rule gives $6\cdot4^n$ lines, each $3^{-n}$ of a side. Each line is an edge of a drawn hexagon, nothing is drawn just outside it, and every hexagon lies inside the curve. A Koch curve also splits at its tip into two smaller Koch curves with their notches flipped. So a snowflake built on a triangle through every other corner of the hexagon has the same six curves in the limit, and at flake round 6 the two drawings are within 0.4% of a hexagon side. [Back](#n-flake-ref-2)
3. <span id="n-flake-source-3"></span> [N-flake](https://en.wikipedia.org/wiki/N-flake) states that the boundary of a hexaflake is the Koch curve. [Back](#n-flake-ref-3)
