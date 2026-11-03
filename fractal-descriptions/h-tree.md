# H Tree

Draw a horizontal line. Center a shorter vertical line on each endpoint. The three lines form an H.

Center horizontal lines on the four new endpoints. Continue alternating horizontal and vertical lines, making each new line about 71% as long as the one before it. After two steps, the length has halved.

<figure data-lesson="h-tree-route"></figure>

The 71% comes from the frame around the picture, a rectangle with sides in the ratio $\sqrt2:1$. A sheet of A4 paper has very nearly this shape.<sup><a id="h-tree-ref-1" href="#h-tree-source-1">1</a></sup> Divide the rectangle in half across its long side. Each half is the same shape again, scaled down to about 71%. The first line joins the centers of those two halves. Divide each half the same way, and the next two lines join the centers of the quarters. Every later line does the same, so the tree never leaves the rectangle.

After any round, each tip is the center of one small rectangle, and the small rectangles together make up the whole frame. The picture outlines the one around the chosen tip. The small rectangles shrink every round, so every point of the frame ends up close to a tip. The readout gives the largest gap possible, and it halves every two rounds.

So the tree comes as close as you like to every point of the rectangle, but it never contains them all.<sup><a id="h-tree-ref-2" href="#h-tree-source-2">2</a></sup> The upright line through the center, for example, meets the tree only at the center, because every later line stays on one side of it.

Move your pointer over the picture, or tap on a phone. The white route runs from the center of the tree to the nearest tip. Try a tip close to the center, then one in a far corner. The straight-line distance from the center changes a lot. The route stays the same length. Click to keep a route in view while you try another.

The route to any tip follows half of the first line, then half of a line from each later round. Every tip has the same list of pieces, so every route in a round is equally long.<sup><a id="h-tree-ref-3" href="#h-tree-source-3">3</a></sup>

This has a practical use in circuits. Put a clock at the center and a circuit component at each tip, and the clock's signal travels the same length of wire to reach each one.<sup><a id="h-tree-ref-4" href="#h-tree-source-4">4</a></sup>

## Further exploring

### Videos

- [Clock Distribution — Adi Teman, Bar-Ilan University](https://www.youtube.com/watch?v=3MhUh4XOUb0)

### Reading

- [H-fractal — MathWorld](https://mathworld.wolfram.com/H-Fractal.html)

## Sources and notes

1. <span id="h-tree-source-1"></span> [Paper size](https://en.wikipedia.org/wiki/Paper_size). [Back](#h-tree-ref-1)
2. <span id="h-tree-source-2"></span> [H tree](https://en.wikipedia.org/wiki/H_tree). [Back](#h-tree-ref-2)
3. <span id="h-tree-source-3"></span> Calculation. With a first line of length 1, the frame is 2 wide and $\sqrt2$ tall. After round $n$, the route to any tip has length $\tfrac12\left(1 + r + r^2 + \dots + r^n\right)$ with $r = 1/\sqrt2$, and no point of the frame is farther than $\sqrt{3/2}\;r^{\,n+1}$ from a tip. [Back](#h-tree-ref-3)
4. <span id="h-tree-source-4"></span> [COS 126 Recursive Graphics Assignment](https://www.cs.princeton.edu/courses/archive/fall02/cs126/assignments/htree.html). [Back](#h-tree-ref-4)
