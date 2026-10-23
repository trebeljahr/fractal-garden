# H Tree

Draw one horizontal segment. At each endpoint, centre a shorter vertical segment. Repeat at the new endpoints, alternating horizontal and vertical. Each segment produces two children. After depth $n$, the drawing contains $1+2+\cdots+2^n=2^{n+1}-1$ segments.

The ratio control sets each child's length to $r$ times its parent's. The default is $r=1/\sqrt2$. Two generations then halve the length and create four smaller arrangements.

<figure data-construction-player="h-tree"></figure>

The endpoint positions explain that particular ratio. Along an infinite branch, horizontal displacements have magnitudes $L/2,Lr^2/2,Lr^4/2,\ldots$, with independent plus or minus choices. Vertical displacements have the same series multiplied by $r$.

At $r^2=1/2$, these are signed binary expansions. They reach every horizontal and vertical coordinate in a rectangle whose width-to-height ratio is $1/r=\sqrt2$. The closure of the growing tree therefore fills that rectangle. It has the same proportions as an A-series paper sheet.

Closure matters here. The countable union of the finite straight segments has Hausdorff dimension 1. Adding all its limit points gives the rectangle, with dimension 2.<sup><a id="h-tree-ref-1" href="#h-tree-source-1">1</a></sup>

H-tree layouts also distribute clock signals in circuits. Every tip at the same depth has the same path length from the centre, making wire-length matching possible.<sup><a id="h-tree-ref-2" href="#h-tree-source-2">2</a></sup> Compare the binary branching in the [Fractal canopy](/fractal-canopy) and [Pythagoras tree](/pythagoras-tree), or the four-corner placement in the [T-square](/t-square-fractal).

## Sources and notes

1. <span id="h-tree-source-1"></span> Direct derivation from this page’s alternating binary construction. The two coordinate series are independent; at r² = 1/2 each spans an interval. Their sums give width L/(1−r²) and height Lr/(1−r²). The dimension distinction follows from countable stability of Hausdorff dimension. [Back](#h-tree-ref-1)
2. <span id="h-tree-source-2"></span> Princeton University, [COS 126 Recursive Graphics Assignment](https://www.cs.princeton.edu/courses/archive/fall02/cs126/assignments/htree.html), 2002. Explains H-tree circuit layouts with equal wire lengths from the central clock to exposed endpoints. [Back](#h-tree-ref-2)
