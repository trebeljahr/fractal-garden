# 3D Vicsek Fractal

Divide a cube into 27 equal cubes. Keep the center cube and the six cubes touching its faces. Remove the other twenty.

The seven remaining cubes form a three-dimensional cross. Repeat this replacement inside each of them.<sup><a id="vicsek-fractal-3d-ref-1" href="#vicsek-fractal-3d-source-1">1</a></sup>

<figure data-construction-player="vicsek-fractal-3d"></figure>

Every step multiplies the number of cubes by seven and divides their width by three. Dividing the width by three divides the volume by 27. The combined volume is therefore $7/27$ of the previous step's volume.

Seen straight along one arm, the front cube hides the center and back cubes. Only five square positions remain visible: the center and four side squares. Repeating the projection at smaller scales produces the plus-shaped [2D Vicsek fractal](/vicsek-fractal-2d).

<figure data-projection="vicsek"></figure>

This cross also loses exposed surface area as the steps continue. Although there are more faces, each face is much smaller. Their total area tends to zero. The [Menger sponge](/menger-sponge) has a different arrangement of cubes, and its exposed area increases instead.

## Sources and notes

1. <span id="vicsek-fractal-3d-source-1"></span> John E. Hutchinson, [Fractals and Self-Similarity](https://maths-people.anu.edu.au/~john/Assets/Research%20Papers/fractals_self-similarity.pdf), Indiana University Mathematics Journal 30 (1981), 713–747, §3.1. Background on sets formed by repeatedly taking smaller copies. [Back](#vicsek-fractal-3d-ref-1)
