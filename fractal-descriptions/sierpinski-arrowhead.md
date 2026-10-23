# Sierpinski Arrowhead

The arrowhead approaches the [Sierpinski triangle](/l-system/sierpinski-triangle) with one continuous route. It keeps the triangular gaps while replacing each old part with three smaller parts.<sup><a id="sierpinski-arrowhead-ref-1" href="#sierpinski-arrowhead-source-1">1</a></sup>

The lesson uses `A → B-A-B` and `B → A+B+A`, starting from A. Both letters draw, and each turn is 60 degrees. A and B choose opposite orientations of the three-part motif.

<figure data-investigation="sierpinski-arrowhead"></figure>

The main drawing writes the same construction with non-drawing symbols. It starts with `YF` and uses `X → YF+XF+Y` and `Y → XF-YF-X`. Only F draws. Each replacement creates three X/Y symbols and two new F strokes, while old F strokes remain. Consequently, both descriptions produce $3^n$ strokes after $n$ rewrites.

The endpoint chord doubles in length before rescaling. Halve each new stroke to preserve that chord. Three pieces at half scale give dimension $\log3/\log2$, the same value as the triangle construction.

The orientation changes between odd and even orders. The page rotates alternate stages so their overall placement remains comparable. The square-grid [Sierpinski curve](/l-system/sierpinski-curve) shares the name but approaches a different limiting set.

## Sources and notes

1. <span id="sierpinski-arrowhead-source-1"></span> Przemysław Prusinkiewicz and Aristid Lindenmayer, [The Algorithmic Beauty of Plants, chapter 1](https://algorithmicbotany.org/papers/abop/abop-ch1.lowquality.pdf), Springer-Verlag, 1990. Figure 1.10 and section 1.4 describe a recursive route through the Sierpiński gasket. The two notations, stroke recurrence, chord scale and alternating display rotation above are derived from this page and its lesson preset. [Back](#sierpinski-arrowhead-ref-1)
