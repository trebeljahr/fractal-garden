# Twindragon

Draw a [dragon curve](/l-system/dragon-curve). Make another copy and turn it halfway around the midpoint between the two ends.

The second dragon starts where the first ends. It finishes where the first began. Together they make a closed route.

<figure data-construction-player="twindragon"></figure>

The two colors help you follow the two paths. Each follows the dragon rules, `F → F+G` and `G → F-G`, with right-angle turns. Both letters draw forward.

At early stages, there are gaps between the lines. In the infinite limit, the paths cover a tile's inside as well as its outline.

Copies of that tile fit together to cover the plane. The tiling view repeats the paired dragons sideways and along the direction between their ends.

## A tile made from zeros and ones

There is another way to describe the same tile: use binary digits with a complex-number base. Adding each digit chooses one of two smaller copies, shrunk and turned by 45 degrees.<sup><a id="twindragon-ref-1" href="#twindragon-source-1">1</a></sup>

The digits become an address for a point inside the tile. The [Terdragon](/l-system/terdragon) uses a related three-piece construction.

## Sources and notes

1. <span id="twindragon-source-1"></span> Tobey Mathis and Kiko Kawamura, [Revolving sequences and Terdragon](https://arxiv.org/html/2106.10549), arXiv:2106.10549, 2021. Section 1 gives the Twindragon’s two-map complex representation. Donald Knuth’s [Recreational Computer Science](https://cs.stanford.edu/~knuth/recreational-cs.pdf), Joint Mathematics Meetings lecture slides, 2024, describes the binary complex-base digit tile. The two-colour route and translation vectors come from this page’s renderer. [Back](#twindragon-ref-1)
