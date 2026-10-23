# Menger Sponge

Split a cube into 27 equal cubes. Remove the center and the six face centers. Repeat inside the twenty surviving cubes. In grid coordinates, a cell survives exactly when at most one of its three coordinates is the middle cell.

<figure data-construction-player="menger"></figure>

After $n$ replacements, $20^n$ cubes remain, each with side $3^{-n}$ of the original. For a unit starting cube,

$$
V_n=(20/27)^n,\qquad D=\frac{\log20}{\log3}\approx2.727.
$$

The limit has zero volume. Every finite stage still contains solid cubes. Its six outside faces follow the [Sierpinski carpet](/sierpinski-carpet) rule.

<figure data-article-images="menger"></figure>

## Shadows, slices and knots

A face-on parallel shadow is also a carpet. At every scale, a projected square disappears only when both visible coordinates occupy their middle thirds. The hidden coordinate can always take an outer-third value.

A central slice perpendicular to a body diagonal gives a hexagon with six-pointed star holes. The three perpendicular tunnel families meet that plane at different angles. George Hart demonstrates this cut in his *Mathematical Impressions* video.<sup><a id="menger-sponge-ref-1" href="#menger-sponge-source-1">1</a></sup>

<figure data-projection="menger"></figure>

A shadow combines a complete viewing ray. A slice keeps one plane. They need not resemble each other.

The sponge also contains every tame knot type. Broden, Espinosa, Nazareth and Voth give a constructive proof: every knot can follow boundary edges of some finite construction stage.<sup><a id="menger-sponge-ref-2" href="#menger-sponge-source-2">2</a></sup> Those chosen edges survive all later removals. The claim concerns curves **in the remaining material**, rather than strings passed through its tunnels.

Which stage suffices depends on the knot. The result does not say one fixed finite edge graph contains every knot. Their paper also places every pretzel knot in the [Sierpinski tetrahedron](/sierpinski-tetrahedron).

## Sources and notes

1. <span id="menger-sponge-source-1"></span> George Hart, [Mathematical Impressions: The Surprising Menger Sponge Slice](https://www.simonsfoundation.org/news/mathematical-impressions-the-surprising-menger-sponge-slice/), Simons Foundation, 10 December 2012. Original video demonstration of the diagonal section. [Back](#menger-sponge-ref-1)
2. <span id="menger-sponge-source-2"></span> Joshua Broden, Malors Espinosa, Noah Nazareth and Niko Voth, [Knots Inside Fractals](https://arxiv.org/pdf/2409.03639), 2024 preprint, Theorem A and proof. Constructive knot embeddings in finite-stage edges, which remain in the infinite sponge. [Back](#menger-sponge-ref-2)
