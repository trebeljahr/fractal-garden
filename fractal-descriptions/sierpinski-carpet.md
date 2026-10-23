# Sierpinski Carpet

Divide a square into a three-by-three grid. Remove the open middle square, keeping its boundary. Repeat inside each of the eight surviving squares. The infinite carpet is the intersection of these nested stages.<sup><a id="sierpinski-carpet-ref-1" href="#sierpinski-carpet-source-1">1</a></sup>

<figure data-construction-player="carpet"></figure>

At level $n$, the construction contains $8^n$ squares of side $3^{-n}$ relative to the seed. Its area fraction is

$$
A_n=(8/9)^n,
$$

which tends to zero. The limiting set still contains the entire outer border and every hole's border. It is connected, despite containing no filled disk. Every finite stage retains positive area.

<figure data-article-images="carpet"></figure>

The Hausdorff dimension is $\log8/\log3\approx1.893$. A ternary coordinate test expresses the same construction: exclude points whose two coordinates both use digit $1$ at the same scale. Boundary points need the expansion consistent with the retained closed squares.

## Square holes are not essential

Mario Bonk proves that the standard carpet can map to a **round carpet**, with circular complementary holes.<sup><a href="#sierpinski-carpet-source-1">1</a></sup> The map is quasisymmetric: it controls relative distance distortion while preserving which points and paths connect. The square corners can disappear without tearing the carpet apart.

A different connection keeps the squares exactly. The [Menger sponge](/menger-sponge) has this carpet on each outside face and in every face-on parallel shadow. A projected cell survives whenever some cube survives along its viewing ray. Choosing an outer-third depth coordinate leaves precisely the eight allowed planar cells.

A central diagonal slice through the sponge instead has six-pointed star holes. Its page compares the slice with the shadow. The [2D Vicsek fractal](/vicsek-fractal-2d) keeps five cells from the carpet's grid and has a lower dimension.

## Sources and notes

1. <span id="sierpinski-carpet-source-1"></span> Mario Bonk, [Uniformization of Sierpiński carpets in the plane](https://arxiv.org/pdf/1009.4094), Inventiones Mathematicae 186 (2011), 559–665, Corollary 1.2 and §12. Standard carpet construction, topology and quasisymmetric round uniformization. Area and digit test follow from the displayed rule. [Back](#sierpinski-carpet-ref-1)
