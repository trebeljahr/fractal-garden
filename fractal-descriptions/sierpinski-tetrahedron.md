# Sierpinski Tetrahedron

The Sierpinski Tetrahedron, sometimes called the tetrix, is what you get when you take the [Sierpinski Triangle](/l-system/sierpinski-triangle) and give it one more dimension. Start with a regular tetrahedron, shrink it to half its size, and put one copy at each of its four corners. Then do the same thing to every copy, again and again.

Neighbouring copies touch at a single point, the midpoint of the edge between them, and each step carves an octahedron-shaped hole out of the middle of every tetrahedron. After $n$ steps there are $4^n$ tiny tetrahedra, and the volume has dropped to $\left(\tfrac{1}{2}\right)^n$ of the start. The surface area does something stranger: every copy has a quarter of the area of its parent, and there are four of them, so the total surface area never changes.

Because each step makes $N = 4$ copies at scale $r = \tfrac{1}{2}$, the Hausdorff dimension is

$$
D = \frac{\log 4}{\log 2} = 2
$$

Its Hausdorff dimension equals that of a flat surface, although the object extends through three-dimensional space.

The square-based variant uses a pyramid with a square base and four equilateral sides. It makes $N = 5$ copies at scale $\tfrac{1}{2}$, one at the apex and one at each base corner, which gives

$$
D = \frac{\log 5}{\log 2} \approx 2.32
$$

Both shapes are three-dimensional [N-Flakes](/n-flake): copies of a solid, shrunk towards each of its corners. The [Polyhedron Flake](/polyhedron-flake) page does the same with the octahedron, dodecahedron and icosahedron, and the [Menger Sponge](/menger-sponge) and [3D Vicsek Fractal](/vicsek-fractal-3d) are the cube members of the family.

## A solid square shadow from a hollow tetrahedron

Look along the line joining the midpoints of two opposite edges. With parallel viewing rays, the tetrahedron casts a completely filled square shadow. Its four half-size copies project into the square's four quadrants. Every later subdivision fills those quadrants again, so no holes appear in this shadow, even in the infinite limit.

Tsuiki illustrates the square shadow in his [2007 paper](https://www.i.h.kyoto-u.ac.jp/~tsuiki/papers/Bridges2007.pdf).

Now look parallel to an edge. Two of the four corner copies overlap exactly in projection. Three distinct half-size triangular copies remain, producing an affine version of the [Sierpinski triangle](/l-system/sierpinski-triangle). Its triangle is stretched compared with the equilateral version in the 2D explorer.

<figure data-projection="tetrahedron"></figure>

The same object can therefore have a shadow with positive area in one direction and zero area in another. Its dimension of two alone does not imply these particular shadows. They follow from the arrangement of its copies.

Hideki Tsuiki studies this property as a **fractal imaginary cube**, with square shadows in three mutually perpendicular directions. His [2025 paper on projected Sierpinski tetrahedra](https://ems.press/journals/jfg/articles/14298648) examines which directions give shadows with positive area. These exact statements use orthographic projection. The full 3D explorer uses perspective.
