# 3D Vicsek Fractal

Divide a cube into 27 equal cubes, keep the center cube and the six cubes touching its faces, and remove the other twenty. The seven that remain form a three-dimensional cross, and each of them gets the same replacement, again and again.<sup><a id="vicsek-fractal-3d-ref-1" href="#vicsek-fractal-3d-source-1">1</a></sup>

<figure data-construction-player="vicsek-fractal-3d"></figure>

Every step multiplies the number of cubes by seven and divides their width by three. Dividing the width by three divides each cube's volume by 27, so the combined volume is $7/27$ of the previous step's volume.

Looking straight along one arm, the front cube hides the center and back cubes, so you see five squares arranged as a plus sign. Repeat the construction and the shadow becomes the plus-shaped [2D Vicsek fractal](/vicsek-fractal-2d).

<figure data-projection="vicsek"></figure>

## Further exploring

- [Three-dimensional Vicsek fractal — Wikipedia](https://en.wikipedia.org/wiki/Vicsek_fractal#Analogues_in_higher_dimensions)
- [Greek Cross Fractal in 2D and 3D — Robert Dickau](https://www.robertdickau.com/greekcross.html)

## Sources and notes

1. <span id="vicsek-fractal-3d-source-1"></span> John E. Hutchinson, [Fractals and Self-Similarity](https://maths-people.anu.edu.au/~john/Assets/Research%20Papers/fractals_self-similarity.pdf), Indiana University Mathematics Journal 30 (1981), 713–747, §3.1. Background on sets formed by repeatedly taking smaller copies. [Back](#vicsek-fractal-3d-ref-1)
