# N-Flake

Replace a regular polygon with one smaller copy at each vertex. Each copy keeps the parent's orientation. Repeat on every new polygon. The number of sides determines both the copy count and the scale.

<figure data-construction-player="n-flake"></figure>

The explorer uses

$$
r=\left[2\left(1+\sum_{j=1}^{\lfloor n/4\rfloor}\cos\frac{2\pi j}{n}\right)\right]^{-1}.
$$

This is a geometric placement rule. It gives $r=1/2$ for triangles and squares, $r=1/\varphi^2$ for pentagons, and $r=1/3$ for hexagons. Here $\varphi=(1+\sqrt5)/2$.

For the corner-only construction, $n$ non-overlapping copies give dimension $\log n/\log(1/r)$.<sup><a id="n-flake-ref-1" href="#n-flake-source-1">1</a></sup> The triangle becomes the [Sierpinski triangle](/l-system/sierpinski-triangle). Five pentagonal copies give approximately $1.672$, while six hexagonal copies give approximately $1.631$. More vertices can therefore give a smaller dimension.

## The center option changes the rule

The explorer permits a central copy for four, five or six sides. Its orientation stays the same as the corner copies.

For squares, four half-size corner copies already tile the entire parent square. A central copy overlaps them. Filled stages stay a square, and the limiting set has dimension $2$. Applying $\log5/\log2$ would incorrectly predict a dimension above the plane's dimension.

For pentagons, the same-orientation central copy also overlaps corner copies. A dimension formula that assumes disjoint pieces does not apply automatically. For hexagons, the seven one-third-size copies have disjoint interiors, giving $\log7/\log3\approx1.771$.

The [2D Vicsek fractal](/vicsek-fractal-2d) uses five squares at one-third scale. Matching a center-and-corners layout alone does not make the constructions equivalent.

## Sources and notes

1. <span id="n-flake-source-1"></span> John E. Hutchinson, [Fractals and Self-Similarity](https://maths-people.anu.edu.au/~john/Assets/Research%20Papers/fractals_self-similarity.pdf), Indiana University Mathematics Journal 30 (1981), §§3 and 5. Separation and dimension theorem; numerical results here follow from the displayed rule. [Back](#n-flake-ref-1)
