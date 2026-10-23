# Gosper Curve

The Gosper curve winds around hexagonal-looking islands without breaking its route. Seven smaller pieces join in different orientations to replace each larger piece.

## A route with a hexagonal rhythm

Its 60-degree turns live on a triangular lattice. Two rewrite symbols arrange the pieces. Forward instructions draw the path between those turns.

<figure data-investigation="gosper-curve"></figure>

The endpoint distance of a seven-part replacement is $\sqrt{7}$ times one small segment. Rescaling to the old span gives seven copies at scale $1/\sqrt{7}$.

The similarity dimension is $\log 7/\log\sqrt{7}=2$. The limiting path fills a region, although each finite approximation consists of line segments. The [Hilbert curve](/l-system/hilbert-curve) achieves a related result on a square grid.
