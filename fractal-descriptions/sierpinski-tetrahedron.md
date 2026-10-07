# Sierpinski Tetrahedron

The Sierpinski Tetrahedron, sometimes called the tetrix, is what you get when you take the [Sierpinski Triangle](/l-system/sierpinski-triangle) and give it one more dimension. Start with a regular tetrahedron, shrink it to half its size, and put one copy at each of its four corners. Then do the same thing to every copy, again and again.

Neighbouring copies touch at a single point, the midpoint of the edge between them, and each step carves an octahedron-shaped hole out of the middle of every tetrahedron. After $n$ steps there are $4^n$ tiny tetrahedra, and the volume has dropped to $\left(\tfrac{1}{2}\right)^n$ of the start. The surface area does something stranger: every copy has a quarter of the area of its parent, and there are four of them, so the total surface area never changes.

Because each step makes $N = 4$ copies at scale $r = \tfrac{1}{2}$, the Hausdorff dimension is

$$
D = \frac{\log 4}{\log 2} = 2
$$

So this is a 3D object with the dimension of a flat surface. A nice way to see that: look at it straight down the line through the midpoints of two opposite edges, and its shadow is a completely filled square with no holes at all. Rotate the tetrahedron here until you find that view.

The square-based variant uses a pyramid with a square base and four equilateral sides. It makes $N = 5$ copies at scale $\tfrac{1}{2}$, one at the apex and one at each base corner, which gives

$$
D = \frac{\log 5}{\log 2} \approx 2.32
$$

Both shapes are three-dimensional [N-Flakes](/n-flake): copies of a solid, shrunk towards each of its corners. The [Polyhedron Flake](/polyhedron-flake) page does the same with the octahedron, dodecahedron and icosahedron, and the [Menger Sponge](/menger-sponge) and [3D Vicsek Fractal](/vicsek-fractal-3d) are the cube members of the family.
