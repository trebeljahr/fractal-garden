# Polyhedron Flake

Replace a solid with one smaller copy toward each vertex. Every copy keeps the parent's orientation. This explorer uses three Platonic solids and three specific shrink ratios.

<figure data-construction-player="polyhedron-flake"></figure>

The **octahedron** has six vertices. Six half-size copies remain, giving

$$
D=\frac{\log6}{\log2}\approx2.585.
$$

A parent octahedron splits into those six octahedra and eight small tetrahedra. The rule removes the tetrahedra. Each remaining octahedron repeats the same gaps.

The **dodecahedron** has twenty vertices and uses $r=1/(2+\varphi)\approx0.2764$. The **icosahedron** has twelve and uses $r=1/(1+\varphi)\approx0.3820$. Their dimensions are

$$
D_{\rm dodeca}=\frac{\log20}{\log(2+\varphi)}\approx2.330,\qquad
D_{\rm icosa}=\frac{\log12}{\log(1+\varphi)}\approx2.582.
$$

Here $\varphi=(1+\sqrt5)/2$. The golden ratio enters the solids' vertex coordinates and the fitted copy sizes. These values use the non-overlapping corner maps shown here, with the usual self-similar dimension theorem.<sup><a id="polyhedron-flake-ref-1" href="#polyhedron-flake-source-1">1</a></sup>

Copy count alone gives the wrong intuition. Twenty smaller dodecahedra produce a lower dimension than twelve larger icosahedra. Their retained volume fractions per replacement are approximately $0.422$ and $0.669$, respectively. Both volumes tend to zero.

A tetrahedron with four half-size corner copies gives the [Sierpinski tetrahedron](/sierpinski-tetrahedron). Eight half-size corner copies of a cube would fill the cube completely. The [Menger sponge](/menger-sponge) instead keeps twenty third-size cubes at corners **and edges**. The seven-cube [3D Vicsek construction](/vicsek-fractal-3d) uses face centers. Neither follows the vertex-only rule of this page.

## Sources and notes

1. <span id="polyhedron-flake-source-1"></span> John E. Hutchinson, [Fractals and Self-Similarity](https://maths-people.anu.edu.au/~john/Assets/Research%20Papers/fractals_self-similarity.pdf), Indiana University Mathematics Journal 30 (1981), §§3 and 5. Separation and dimension theorem; numerical results here follow from the displayed rule. [Back](#polyhedron-flake-ref-1)
