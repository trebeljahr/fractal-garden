# Menger Sponge

Cut a cube into 27 little cubes, like a three-by-three-by-three stack. Remove the middle cube and the cube in the middle of each face. Twenty remain.

Do the same inside every remaining cube. Tunnels open into smaller tunnels.

<figure data-construction-player="menger"></figure>

Each round keeps $20/27$ of the previous volume. Keep cutting forever and the remaining volume falls to zero. Every finite stage still contains solid little cubes.

Each outer face follows the [Sierpinski carpet](/sierpinski-carpet) pattern: a square hole surrounded by eight smaller copies.

<figure data-article-images="menger"></figure>

## Square holes can hide stars

Look straight through the sponge at one face. With parallel viewing rays, its shadow is also a Sierpinski carpet.

Now cut through the middle at a diagonal. The cut has a hexagonal outline and six-pointed star holes. The square tunnels meet the cut at different angles.<sup><a id="menger-sponge-ref-1" href="#menger-sponge-source-1">1</a></sup>

<figure data-projection="menger"></figure>

A shadow combines everything along your line of sight. A slice shows only the material in one flat cut. The same sponge gives two very different pictures.

## Knots in the remaining material

Take any knot made from finitely many straight segments. You can trace that knot along the sponge's remaining edges at a deep enough stage.<sup><a id="menger-sponge-ref-2" href="#menger-sponge-source-2">2</a></sup> The chosen edges survive later cuts.

The knot follows the material itself. It is not a string threaded through the tunnels. More complicated knots can need deeper stages.

The [Sierpinski tetrahedron](/sierpinski-tetrahedron) has a related result for a family called pretzel knots.

## Sources and notes

1. <span id="menger-sponge-source-1"></span> George Hart, [Mathematical Impressions: The Surprising Menger Sponge Slice](https://www.simonsfoundation.org/news/mathematical-impressions-the-surprising-menger-sponge-slice/), Simons Foundation, 10 December 2012. Original video demonstration of the diagonal section. [Back](#menger-sponge-ref-1)
2. <span id="menger-sponge-source-2"></span> Joshua Broden, Malors Espinosa, Noah Nazareth and Niko Voth, [Knots Inside Fractals](https://arxiv.org/pdf/2409.03639), 2024 preprint, Theorem A and proof. Constructive knot embeddings in finite-stage edges, which remain in the infinite sponge. [Back](#menger-sponge-ref-2)
