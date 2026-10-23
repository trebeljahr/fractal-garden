# Twindragon

Make two copies of a [dragon curve](/l-system/dragon-curve). Rotate the second by 180 degrees around the midpoint between the first curve's endpoints.

The second curve starts at the first curve's end and finishes at its start. The two paths therefore form a closed route.

<figure data-construction-player="twindragon"></figure>

Each path follows the same dragon rules. Every step doubles its segment count. The two colors distinguish the original copy from the rotated copy.

The infinite paths cover a region, including its interior. Copies of that region fit together to cover the plane.<sup><a id="twindragon-ref-1" href="#twindragon-source-1">1</a></sup> The tiling view repeats the paired curves in two perpendicular directions.

Finite paths leave gaps inside each repeated region. Increasing the level makes the segments smaller and the gaps harder to see. The completely filled tile describes the infinite limit.

## Sources and notes

1. <span id="twindragon-source-1"></span> Tobey Mathis and Kiko Kawamura, [Revolving sequences and Terdragon](https://arxiv.org/html/2106.10549), arXiv:2106.10549, 2021. Section 1 gives the Twindragon’s two-map complex representation. Donald Knuth’s [Recreational Computer Science](https://cs.stanford.edu/~knuth/recreational-cs.pdf), Joint Mathematics Meetings lecture slides, 2024, describes the binary complex-base digit tile. The two-colour route and translation vectors come from this page’s renderer. [Back](#twindragon-ref-1)
