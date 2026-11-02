# N-Flake

This construction replaces a polygon with smaller copies at its corners. A triangle has three corners, so it produces three copies. A pentagon produces five. Each copy is replaced in the same way on the next step.<sup><a id="n-flake-ref-1" href="#n-flake-source-1">1</a></sup>

<figure data-construction-player="n-flake"></figure>

The copies must shrink enough to fit. Triangle copies are half the original width. Pentagon copies are about 38% of the width, and hexagon copies are one third.

The triangle version is the [Sierpinski triangle](/l-system/sierpinski-triangle). Changing the number of sides changes both the gaps between the copies and the size of each copy.

The **center** option adds another polygon between the corner copies. For squares, the four half-size corner squares already fill the original square. Adding a fifth square in the center covers some of the same area again.

For hexagons, the center copy fits between the six corner copies without overlapping their interiors. Adding it fills a gap that would otherwise remain.

## Further exploring

- [N-flake — Wikipedia](https://en.wikipedia.org/wiki/N-flake)
- [Pentaflake — MathWorld](https://mathworld.wolfram.com/Pentaflake.html)
- [Sierpinski Pentagon — Larry Riddle](https://larryriddle.agnesscott.org/ifs/pentagon/pentagon.htm)

## Sources and notes

1. <span id="n-flake-source-1"></span> John E. Hutchinson, [Fractals and Self-Similarity](https://maths-people.anu.edu.au/~john/Assets/Research%20Papers/fractals_self-similarity.pdf), Indiana University Mathematics Journal 30 (1981), 713–747, §3.1. Background on sets formed by repeatedly taking smaller copies. [Back](#n-flake-ref-1)
