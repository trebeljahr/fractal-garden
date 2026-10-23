# N-Flake

Put a smaller polygon at every corner of a larger one. Give each small polygon its own corner copies. Keep repeating.

Choose a triangle and you get the [Sierpinski triangle](/l-system/sierpinski-triangle). Choose five or six sides and different gaps appear.

<figure data-construction-player="n-flake"></figure>

The number of sides changes both the number of copies and how small they need to be. Triangle copies are half-size. Pentagon copies are about 38% as wide. Hexagon copies are one third as wide.

The five small pentagons keep about 73% of the old area. The six small hexagons keep only two thirds. More copies can leave less area when those copies are smaller.<sup><a id="n-flake-ref-1" href="#n-flake-source-1">1</a></sup>

## What happens if you fill the middle?

The center option adds another copy for squares, pentagons and hexagons.

Four half-size corner squares already fill a square. Adding a central square only creates overlap. You still see a filled square.

The central pentagon also overlaps its neighbors. Counting copies alone cannot tell you how much of the picture they cover.

Seven one-third-size hexagons fit without overlapping interiors. They make a different fractal from the six-corner version.

The [2D Vicsek fractal](/vicsek-fractal-2d) also puts squares at the center and corners, but at one-third size. The size matters as much as the arrangement.

## Sources and notes

1. <span id="n-flake-source-1"></span> John E. Hutchinson, [Fractals and Self-Similarity](https://maths-people.anu.edu.au/~john/Assets/Research%20Papers/fractals_self-similarity.pdf), Indiana University Mathematics Journal 30 (1981), §§3 and 5. Separation and dimension theorem; numerical results here follow from the displayed rule. [Back](#n-flake-ref-1)
