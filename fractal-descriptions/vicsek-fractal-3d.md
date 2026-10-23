# 3D Vicsek Fractal

Split a cube into 27 little cubes. Keep the middle cube and the six cubes touching its faces. They make a cross pointing in six directions.

Repeat inside all seven cubes.

<figure data-construction-player="vicsek-fractal-3d"></figure>

Each round keeps only $7/27$ of the previous volume. The arms gain smaller arms while the volume falls toward zero.

The copies get smaller by a factor of three. Their number grows by a factor of seven.<sup><a id="vicsek-fractal-3d-ref-1" href="#vicsek-fractal-3d-source-1">1</a></sup>

## Seven cubes make a five-square shadow

Look straight down one arm with parallel viewing rays. The front, middle and back cubes overlap in the middle of the shadow. Four others make the arms of a plus sign.

Repeat at smaller sizes and the shadow follows the [2D Vicsek fractal's](/vicsek-fractal-2d) plus-shaped rule.

<figure data-projection="vicsek"></figure>

The full shape keeps three straight lines through its center. They run along the three cube directions, right through all the smaller crosses.

## Even the surface area shrinks

The [Menger sponge](/menger-sponge) gains exposed area as you cut it. This cross eventually loses it.

At the first round, there are more exposed faces than before, but they are much smaller. Count the exposed little faces at each stage and their total area tends to zero. The infinite shape is not an ordinary solid with an ordinary skin.

## Sources and notes

1. <span id="vicsek-fractal-3d-source-1"></span> John E. Hutchinson, [Fractals and Self-Similarity](https://maths-people.anu.edu.au/~john/Assets/Research%20Papers/fractals_self-similarity.pdf), Indiana University Mathematics Journal 30 (1981), §§3 and 5. General contraction and dimension results; calculations here use the stated local construction. [Back](#vicsek-fractal-3d-ref-1)
