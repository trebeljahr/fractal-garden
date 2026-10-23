# Twindragon

Take a [Heighway dragon](/l-system/dragon-curve) from one endpoint to another. Rotate a second copy by 180 degrees around the midpoint of that chord. Its start becomes the first copy's end, and its end becomes the first copy's start.

This page draws those two routes in different colours. Each uses `F → F+G`, `G → F-G`, with 90-degree turns and both letters drawing. At order $n$, the two routes together contain $2^{n+1}$ strokes.

<figure data-construction-player="twindragon"></figure>

Joining the endpoints makes a closed walk. The dense limiting traces cover the Twindragon tile, including its interior. They should not be mistaken for a drawing of only the tile's outer boundary.

The tile also comes from binary digits in a complex base. Infinite sums with digits 0 and 1 and powers of $1/(1-i)$ describe a congruent version of it.<sup><a id="twindragon-ref-1" href="#twindragon-source-1">1</a></sup> Appending a digit scales by $1/\sqrt2$ and rotates through 45 degrees. Two possible next digits select two smaller copies.

The tiling view repeats the paired paths by translation along the endpoint chord and its perpendicular. The limiting tiles cover the plane, while finite paths leave visible gaps inside their footprints. The [Terdragon](/l-system/terdragon) gives a related three-piece construction.

## Sources and notes

1. <span id="twindragon-source-1"></span> Tobey Mathis and Kiko Kawamura, [Revolving sequences and Terdragon](https://arxiv.org/html/2106.10549), arXiv:2106.10549, 2021. Section 1 gives the Twindragon’s two-map complex representation. Donald Knuth’s [Recreational Computer Science](https://cs.stanford.edu/~knuth/recreational-cs.pdf), Joint Mathematics Meetings lecture slides, 2024, describes the binary complex-base digit tile. The two-colour route and translation vectors come from this page’s renderer. [Back](#twindragon-ref-1)
