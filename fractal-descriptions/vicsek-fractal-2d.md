# 2D Vicsek Fractal

Keep five squares from a three-by-three grid. The **diagonal cross** keeps the four corners and center. The **Greek cross** keeps the four side centers and center. Repeat inside every surviving square.

<figure data-investigation="vicsek-fractal-2d"></figure>

After $n$ replacements, $5^n$ squares have side $3^{-n}$ relative to the seed. Both versions therefore have area fraction $(5/9)^n$ and Hausdorff dimension

$$
D=\frac{\log5}{\log3}\approx1.465.
$$

The area tends to zero. The dimension calculation uses the five contractions with disjoint square interiors.<sup><a id="vicsek-fractal-2d-ref-1" href="#vicsek-fractal-2d-source-1">1</a></sup>

## Two crosses, one limiting shape

The two finite constructions look different because they begin with the same axis-aligned square. Their **infinite limits** are similar: rotate the diagonal-cross limit by 45 degrees, then scale it by $1/\sqrt2$ about its center.

This follows directly from their five copy positions. Rotation sends the four diagonal offsets to four axis offsets. Rescaling gives precisely the Greek-cross offsets. The central offset stays fixed. The different initial seed matters less at each contraction, so it does not change that limiting relationship.

The diagonal cross also serves as a deterministic model for diffusion-limited aggregation. M. Wolf studies how random walkers reach different boundary sites, where exposed tips and recessed regions have different hitting probabilities.<sup><a id="vicsek-fractal-2d-ref-2" href="#vicsek-fractal-2d-source-2">2</a></sup> That physical question needs more information than dimension alone.

The Greek cross is the face-on parallel shadow of this garden's seven-cube [3D Vicsek fractal](/vicsek-fractal-3d). Three cubes overlap at the shadow's center, leaving five projected positions. The [Sierpinski carpet](/sierpinski-carpet) uses the same grid but retains eight cells.

## Sources and notes

1. <span id="vicsek-fractal-2d-source-1"></span> John E. Hutchinson, [Fractals and Self-Similarity](https://maths-people.anu.edu.au/~john/Assets/Research%20Papers/fractals_self-similarity.pdf), Indiana University Mathematics Journal 30 (1981), §§3 and 5. General contraction and dimension results; calculations here use the stated local construction. [Back](#vicsek-fractal-2d-ref-1)
2. <span id="vicsek-fractal-2d-source-2"></span> M. Wolf, [A Toy Model for the Diffusion-Limited Aggregation](https://cmst.eu/wp-content/uploads/files/10.12921_cmst.2021.0000031_WOLF.pdf), Computational Methods in Science and Technology 27 (2021), 151–157. Vicsek snowflake and boundary hitting probabilities. The rotation and projection statements above derive from this explorer’s copy positions. [Back](#vicsek-fractal-2d-ref-2)
