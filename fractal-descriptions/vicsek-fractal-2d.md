# 2D Vicsek Fractal

Divide a square into a three-by-three grid. Keep the center square and four others, then remove the rest. Repeat inside all five remaining squares.<sup><a id="vicsek-fractal-2d-ref-1" href="#vicsek-fractal-2d-source-1">1</a></sup>

The **diagonal cross** keeps the four corners. The **Greek cross** keeps the four squares next to the center, making a plus sign.

<figure data-construction-player="vicsek-fractal-2d"></figure>

Both versions retain five of nine equal squares. After two steps they contain 25 squares, each one ninth of the original width. After three steps they contain 125, each one twenty-seventh of the width.

Their area decreases by the same factor, $5/9$, at each step. Their different gaps come from where the five copies are placed.

In the infinite limit, the two versions are rotated and scaled copies of one another. Rotate the diagonal version by 45 degrees and scale it by $1/\sqrt2$. Its four corner positions match the arms of the plus-shaped version.

The [3D version](/vicsek-fractal-3d) produces the plus-shaped pattern as a straight-on shadow. Its front, middle and back cubes overlap in the center of that shadow, while four other cubes form the arms.

## Further reading

- [Vicsek fractal — Wikipedia](https://en.wikipedia.org/wiki/Vicsek_fractal)
- [Greek Cross Fractal — Robert Dickau](https://www.robertdickau.com/greekcross.html)

## Sources and notes

1. <span id="vicsek-fractal-2d-source-1"></span> John E. Hutchinson, [Fractals and Self-Similarity](https://maths-people.anu.edu.au/~john/Assets/Research%20Papers/fractals_self-similarity.pdf), Indiana University Mathematics Journal 30 (1981), 713–747, §3.1. Background on sets formed by repeatedly taking smaller copies. [Back](#vicsek-fractal-2d-ref-1)
