# 3D Vicsek Fractal

Split a cube into 27 equal cubes. Keep the center and its six face neighbors. Repeat inside each of those seven cubes. This page uses the seven-cube spatial cross.

<figure data-investigation="vicsek-fractal-3d"></figure>

After $n$ replacements, $7^n$ cubes have side $3^{-n}$ relative to the seed. The volume fraction and dimension are

$$
V_n=(7/27)^n,\qquad D=\frac{\log7}{\log3}\approx1.771.
$$

The dimension comes from seven contractions whose cube interiors are disjoint.<sup><a id="vicsek-fractal-3d-ref-1" href="#vicsek-fractal-3d-source-1">1</a></sup>

## Surface area tends to zero

For a unit starting cube, let $N=7^n$. The graph that joins face-sharing cubes is a tree. Each replacement contributes six internal adjacencies, and each old adjacency survives as one new adjacency. There are therefore $N-1$ shared-face pairs.

Each cube contributes six faces. Every shared pair hides two. The exposed area is consequently

$$
A_n=\frac{6N-2(N-1)}{9^n}=\frac{4\cdot7^n+2}{9^n}.
$$

It tends to zero, unlike the increasing area of the [Menger sponge](/menger-sponge). This is a calculation for the displayed finite cube unions, not a claim that their limiting set is an ordinary surface.

## Seven cubes cast five squares

Look along a cube axis with parallel rays. The front, central and back cubes overlap. Four other cubes supply the arms of a Greek cross. Projection preserves the one-third copy scale, so the shadow follows exactly the [2D Vicsek fractal's](/vicsek-fractal-2d) Greek-cross rule.

<figure data-projection="vicsek"></figure>

The whole object retains three straight central axes. Its recursive attachments shrink toward point contacts in the limit: repeated subdivision of a contact face retains only its central square, then its center.

## Sources and notes

1. <span id="vicsek-fractal-3d-source-1"></span> John E. Hutchinson, [Fractals and Self-Similarity](https://maths-people.anu.edu.au/~john/Assets/Research%20Papers/fractals_self-similarity.pdf), Indiana University Mathematics Journal 30 (1981), §§3 and 5. General contraction and dimension results; calculations here use the stated local construction. [Back](#vicsek-fractal-3d-ref-1)
