# H Tree

Draw a horizontal line. Center a shorter vertical line on each endpoint. The three lines form an H.

Center horizontal lines on the four new endpoints. Continue alternating horizontal and vertical lines, making each new line shorter than its parent.

<figure data-construction-player="h-tree"></figure>

Every line gets two children. The numbers of new lines are 1, 2, 4, 8, and so on. The default child length is $1/\sqrt2$ of the parent's length, about 71%. Two steps of shrinking halve the length.

At that ratio, the endpoints approach every position in a rectangle as the construction continues. Including all the points they approach gives the whole rectangle. Every finite drawing still has gaps between its lines.<sup><a id="h-tree-ref-1" href="#h-tree-source-1">1</a></sup>

This arrangement has a practical use in circuits. Every endpoint at the same depth is connected to the center by an equally long route. An H-shaped wire layout can therefore distribute clock signals with matched wire lengths.<sup><a id="h-tree-ref-2" href="#h-tree-source-2">2</a></sup>

## Sources and notes

1. <span id="h-tree-source-1"></span> Calculation for the alternating horizontal and vertical lines above. The two coordinate series are independent; at r² = 1/2 each spans an interval. Their sums give width L/(1−r²) and height Lr/(1−r²). [Back](#h-tree-ref-1)
2. <span id="h-tree-source-2"></span> Princeton University, [COS 126 Recursive Graphics Assignment](https://www.cs.princeton.edu/courses/archive/fall02/cs126/assignments/htree.html), 2002. Explains H-tree circuit layouts with equal wire lengths from the central clock to exposed endpoints. [Back](#h-tree-ref-2)
