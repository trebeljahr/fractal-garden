# Koch Surface

Start with a regular tetrahedron, a solid with four equal triangles for faces. On one face, join the midpoints of the edges, which divides it into four equal triangles. Keep the three corner triangles flat, and stand a smaller regular tetrahedron on the middle one. It hides the middle triangle and adds three sloping faces, so with the three corners you have six triangles in place of one. Do this to every face, then repeat on every triangle.<sup><a id="koch-surface-ref-1" href="#koch-surface-source-1">1</a></sup>

<figure data-lesson="koch-cube"></figure>

The tetrahedron's four corners sit on four corners of a cube, drawn around it in the picture, which you can turn by dragging sideways. At round 1, the four new tips land exactly on the cube's other four corners. The later bumps never poke out of the cube and never run into each other, and the solid fills more of the cube every round.

To see how much more, go back to round 0 and press **One face**. The amber lines mark a pyramid standing on that face, with its tip on an empty corner of the cube, and four of these pyramids make up everything in the cube outside the tetrahedron.

At round 1 the new bump reaches that same tip, so it fits inside the pyramid and takes exactly a quarter of the volume. The amber lines now mark what remains: six smaller pyramids of the same shape, one standing on each of the six new triangles. The next round does the same thing inside each of those, at half the width.<sup><a id="koch-surface-ref-2" href="#koch-surface-source-2">2</a></sup>

So each round fills a quarter of whatever is still empty. The tetrahedron takes up a third of the cube, which leaves two thirds empty, then half after round 1 and three eighths after round 2. The empty share heads to zero, so the solid fills the whole cube.<sup><a id="koch-surface-ref-3" href="#koch-surface-source-3">3</a></sup>

The surface area has no such limit. One triangle becomes six, each with a quarter of the area, so the total grows by half every round, and by round 2 it is larger than all six faces of the cube together.

That means the surface can't simply be the cube's six faces. Every triangle, at every round, stays tilted against those faces at the same angle as the tetrahedron's faces, and the edges where the first bumps meet the tetrahedron never move, so they still run through the inside of the cube. In the limit, the cube's plain faces become the outer layer, with all the folded surface still inside them. The authors of one paper on this shape compare it to a geode: smooth outside, crystals inside.<sup><a id="koch-surface-ref-4" href="#koch-surface-source-3">3</a></sup>

## Further exploring

- [Koch curve variants — Wikipedia](https://en.wikipedia.org/wiki/Koch_snowflake#Variants_of_the_Koch_curve)
- [Koch Surfaces — Robert Dickau](https://www.robertdickau.com/kochsurface.html)
- [Triangular Koch Fractal Surface — Wolfram Demonstrations](https://demonstrations.wolfram.com/TriangularKochFractalSurface/)

## Sources and notes

1. <span id="koch-surface-source-1"></span> [Creating Square Koch Surfaces Using Origami](https://archive.bridgesmathart.org/2024/bridges2024-567.pdf). [Back](#koch-surface-ref-1)
2. <span id="koch-surface-source-2"></span> Calculation. A pyramid whose three edges at the tip meet at right angles, each of length $a$, has volume $a^3/6$. The four empty pyramids have $a$ equal to the cube's side $s$, so the tetrahedron has $s^3 - 4 \cdot s^3/6 = s^3/3$. A bump has volume $a^3/24$, and the six smaller pyramids have edges $a/2$. Added to the solid: $\tfrac16 + \tfrac18 + \tfrac{3}{32} + \dots = \tfrac23$ of the cube. Volumes and areas measured from this page's triangles match through round 5. [Back](#koch-surface-ref-2)
3. <span id="koch-surface-source-3"></span> [3D Koch-type crystals](https://arxiv.org/abs/2302.10628), Example 3. The paper's Koch 2-surface is this rule on one face. [Back](#koch-surface-ref-3) [Back](#koch-surface-ref-4)
