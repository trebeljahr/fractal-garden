# Terdragon

The rule `F → F+F-F` replaces each stroke with three strokes. Plus and minus turn through opposite 120-degree angles. Starting with F gives 1, 3, 9, 27 and then $3^n$ strokes after $n$ rewrites.

The first and third strokes point in the original direction. The middle stroke points 120 degrees away. Their vector sum is

$$
2+e^{2\pi i/3}=\frac32+\frac{\sqrt3}{2}i.
$$

Its length is $\sqrt3$ and its direction is 30 degrees. The renderer subtracts another 30 degrees from its initial heading at each stage to keep the endpoint chord horizontal.

<figure data-construction-player="terdragon"></figure>

With that chord fixed, every new stroke shrinks by $1/\sqrt3$. Three copies at this scale have similarity exponent $\log3/\log\sqrt3=2$. This count alone is not a proof that a self-similar set has area.

The same construction has an exact description using three contractions of the complex plane. Mathis and Kawamura express its points through constrained digit sequences, linking the geometric turns to a representation of numbers.<sup><a id="terdragon-ref-1" href="#terdragon-source-1">1</a></sup> A point's infinite address records which of the three pieces contains it at each scale.

The [Dragon curve](/l-system/dragon-curve) uses two pieces and 90-degree turns. The [Twindragon](/l-system/twindragon) pairs two such paths.

## Sources and notes

1. <span id="terdragon-source-1"></span> Tobey Mathis and Kiko Kawamura, [Revolving sequences and Terdragon](https://arxiv.org/html/2106.10549), arXiv:2106.10549, 2021. Section 3 gives the terdragon’s three contraction maps, each of modulus 1/√3, and its ternary revolving sequences. The vector sum, stroke count and display counter-rotation are direct derivations from the renderer. [Back](#terdragon-ref-1)
