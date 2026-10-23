# H Tree

Draw a horizontal line. Center a shorter vertical line on each end. You have an H.

Add horizontal lines at the four new ends. Then vertical lines at their ends. Keep alternating.

<figure data-construction-player="h-tree"></figure>

Each line gets two children. The number of new lines doubles: 1, 2, 4, 8. The default makes each child about 71% as long as its parent. After two rounds, the new lines are half as long.

With that ratio, the branches reach more and more of a rectangle. Include every point they approach, and the infinite result fills it. The rectangle has the same proportions as A-series paper.<sup><a id="h-tree-ref-1" href="#h-tree-source-1">1</a></sup>

Every drawing on screen still leaves gaps. The filled rectangle describes the infinite limit, including all those approached points.

## Equal journeys to every tip

H-shaped layouts help distribute clock signals inside circuits. Every tip at the same depth has the same wire length back to the center.<sup><a id="h-tree-ref-2" href="#h-tree-source-2">2</a></sup> The repeated forks give each signal an equally long route.

The [fractal canopy](/fractal-canopy) also grows from forks. The [T-square](/t-square-fractal) puts a smaller square at each corner instead.

## Sources and notes

1. <span id="h-tree-source-1"></span> Direct derivation from this page’s alternating binary construction. The two coordinate series are independent; at r² = 1/2 each spans an interval. Their sums give width L/(1−r²) and height Lr/(1−r²). The dimension distinction follows from countable stability of Hausdorff dimension. [Back](#h-tree-ref-1)
2. <span id="h-tree-source-2"></span> Princeton University, [COS 126 Recursive Graphics Assignment](https://www.cs.princeton.edu/courses/archive/fall02/cs126/assignments/htree.html), 2002. Explains H-tree circuit layouts with equal wire lengths from the central clock to exposed endpoints. [Back](#h-tree-ref-2)
