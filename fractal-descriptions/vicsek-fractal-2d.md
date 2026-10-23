# 2D Vicsek Fractal

Divide a square into nine little squares. Keep five. Repeat inside each square you kept.

The **diagonal cross** keeps the middle and four corners. The **Greek cross** keeps the middle and its four side neighbors, making a plus sign.

<figure data-construction-player="vicsek-fractal-2d"></figure>

Each round keeps five ninths of the previous area. After infinitely many rounds, that area falls to zero. Both rules use five one-third-size copies.<sup><a id="vicsek-fractal-2d-ref-1" href="#vicsek-fractal-2d-source-1">1</a></sup>

## Turn one cross into the other

The two finite drawings look different. But their infinite versions are the same shape at a different size and angle.

Turn the diagonal version by 45 degrees and shrink it to about 71% of its width. It matches the plus-shaped version. The corners move onto the four arms.

Researchers use the diagonal version as a simple model for studying where wandering particles land. Exposed tips are easier to reach than deep gaps.<sup><a id="vicsek-fractal-2d-ref-2" href="#vicsek-fractal-2d-source-2">2</a></sup> The [aggregation explorer](/diffusion-limited-aggregation) lets those arrivals build branches of their own.

The plus-shaped version is also the straight-on shadow of the [3D Vicsek fractal](/vicsek-fractal-3d). The [Sierpinski carpet](/sierpinski-carpet) uses the same nine-square grid but keeps eight squares.

## Sources and notes

1. <span id="vicsek-fractal-2d-source-1"></span> John E. Hutchinson, [Fractals and Self-Similarity](https://maths-people.anu.edu.au/~john/Assets/Research%20Papers/fractals_self-similarity.pdf), Indiana University Mathematics Journal 30 (1981), §§3 and 5. General contraction and dimension results; calculations here use the stated local construction. [Back](#vicsek-fractal-2d-ref-1)
2. <span id="vicsek-fractal-2d-source-2"></span> M. Wolf, [A Toy Model for the Diffusion-Limited Aggregation](https://cmst.eu/wp-content/uploads/files/10.12921_cmst.2021.0000031_WOLF.pdf), Computational Methods in Science and Technology 27 (2021), 151–157. Vicsek snowflake and boundary hitting probabilities. The rotation and projection statements above derive from this explorer’s copy positions. [Back](#vicsek-fractal-2d-ref-2)
