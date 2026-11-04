# Quadratic Koch Surface

Divide a face of a cube into nine squares and put a smaller cube on the middle square, as wide as that square. Do this on all six faces, then repeat on every exposed square. That includes the sides of the new cubes, so smaller cubes get added sideways as well as outward.<sup><a id="quadratic-koch-3d-ref-1" href="#quadratic-koch-3d-source-1">1</a></sup>

<figure data-construction-player="quadratic-koch-3d"></figure>

Putting a cube on a face covers one square and exposes five: its top and four sides. The nine squares become thirteen of the same size, so every level multiplies the surface area by $13/9$, and it grows without limit.

All those sideways cubes change the solid's outline, which a shadow shows clearly. Shine a light straight at one face from far away and look at the shadow on a wall behind the solid, by choosing **Shadow** and going back to level 0.

The starting cube casts a square. Its four side faces run along the light, so each one casts only a line: one side of that square.

At level 1, the cube on the middle of a side face sticks out past that line, so it casts a bump on the line's middle third: three sides of a small square. Three of that cube's faces run along the light, and they cast those three sides, so at level 2 each of the five lines gets its own bump. Cubes on the front and back faces stick out toward the light or away from it, and their shadows fall inside what is already there.<sup><a id="quadratic-koch-3d-ref-3" href="#quadratic-koch-3d-source-2">2</a></sup> The outline is the line from the [quadratic snowflake](/l-system/quadratic-snowflake), with its notches turned outward.

The figure also draws a diamond through the square's four corners, and the pale triangles inside it show where the bumps can go. Each one sits on the outer side of a line, with that line as its long side. At the next level the bump takes a square out of the triangle, and the rest of the triangle becomes five smaller triangles, one on each new line, as you can see by comparing levels 1 and 2. So a bump never leaves its triangle.

Each smaller triangle has a ninth of the old area, so each level leaves $5/9$ of the pale area. Repeat forever and the pale area heads to zero, so the shadow fills the whole diamond. Only the line itself is left, and it covers no area. At level 0, the square's two diagonals divide it into four triangles the same size as the four pale ones, so the diamond has exactly twice the area of a face.

The [Koch surface](/koch-surface) built on a tetrahedron fills a whole cube, but the solid here doesn't fill the shape that holds it: the starting cube with a pyramid on each face, its tip half the cube's width out from the face's center. Choose **Solid** and watch **Volume**. It heads to exactly $10/7$ starting cubes, while the cube and its six pyramids hold $2$.<sup><a id="quadratic-koch-3d-ref-4" href="#quadratic-koch-3d-source-3">3</a></sup>

Neel Shrestha developed a way to fold this construction in paper, and his origami models use the same thirteen-square replacement.<sup><a id="quadratic-koch-3d-ref-2" href="#quadratic-koch-3d-source-1">1</a></sup>

## Further exploring

- [Koch curve variants — Wikipedia](https://en.wikipedia.org/wiki/Koch_snowflake#Variants_of_the_Koch_curve)
- [Koch Surface Fractals — Robert Dickau](https://www.robertdickau.com/kochsurface.html)
- [Square Koch Fractal Surface — Wolfram Demonstrations](https://demonstrations.wolfram.com/SquareKochFractalSurface/)

## Sources and notes

1. <span id="quadratic-koch-3d-source-1"></span> Neel Shrestha, [Creating Square Koch Surfaces Using Origami](https://archive.bridgesmathart.org/2024/bridges2024-567.pdf), Bridges 2024, pp. 567–572. Origami folding method and thirteen-square replacement. [Back](#quadratic-koch-3d-ref-1) [Back](#quadratic-koch-3d-ref-2)
2. <span id="quadratic-koch-3d-source-2"></span> Calculation. Through level 4, the faces this page builds cast exactly the drawn shadow along all three axes, compared square by square. A cube on a front face stays clear of that face's edges: it starts a third of the way in, and its sideways bumps reach at most half of its own width. [Back](#quadratic-koch-3d-ref-3)
3. <span id="quadratic-koch-3d-source-3"></span> Calculation. A cube on a square of width $a$ has volume $a^3/27$, and thirteen squares of width $a/3$ then repeat the rule. So the bumps on that square add up to $V$, where $V = a^3/27 + 13V/27$, which gives $V = a^3/14$. The pyramid holds $a^3/6$, so each one ends up $3/7$ full. Through level 4, no two of this page's faces coincide and the volume enclosed by its faces matches this sum. [Back](#quadratic-koch-3d-ref-4)
