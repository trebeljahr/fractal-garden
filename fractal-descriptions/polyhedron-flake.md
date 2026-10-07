# Polyhedron Flake

A polyhedron flake is the three-dimensional version of an [N-Flake](/n-flake). Take a regular solid, make one smaller copy of it for every corner, and push each copy into its corner. Then repeat that on every copy. The [Sierpinski Tetrahedron](/sierpinski-tetrahedron) is the flake you get from a tetrahedron, and the cube version leads to the [Menger Sponge](/menger-sponge) and [3D Vicsek Fractal](/vicsek-fractal-3d) family. This page covers the other three Platonic solids.

The scale of each copy is picked so that neighbouring copies just touch and never overlap. With $N$ copies at scale $r$, the Hausdorff dimension is

$$
D = \frac{\log N}{\log (1/r)}
$$

**Octahedron flake.** Six copies at half size, one per corner. What gets removed at each step is eight small tetrahedra, one under each face, because an octahedron splits exactly into six half-size octahedra and eight tetrahedra. The dimension is

$$
D = \frac{\log 6}{\log 2} \approx 2.585
$$

**Dodecahedron flake.** Twenty copies, scaled by $r = \frac{1}{2 + \varphi} \approx 0.276$, where $\varphi = \frac{1 + \sqrt{5}}{2}$ is the golden ratio. A dodecahedron is wide compared to its edge length, so the copies have to shrink a lot before neighbours stop overlapping. That gives

$$
D = \frac{\log 20}{\log (2 + \varphi)} \approx 2.330
$$

**Icosahedron flake.** Twelve copies, scaled by $r = \frac{1}{1 + \varphi} \approx 0.382$, which leads to

$$
D = \frac{\log 12}{\log (1 + \varphi)} \approx 2.582
$$

The golden ratio shows up in the last two because it is already built into the dodecahedron and icosahedron: the corner coordinates of both solids are written with $\varphi$. Twenty copies per step grow fast, so the dodecahedron flake stops at two iterations here, while the icosahedron goes one level further.

For flat versions of the same idea, such as the pentaflake and hexaflake, try the [N-Flake](/n-flake) page.
