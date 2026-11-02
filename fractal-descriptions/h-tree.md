# H Tree

Draw a horizontal line. Center a shorter vertical line on each endpoint. The three lines form an H.

Center horizontal lines on the four new endpoints. Continue alternating horizontal and vertical lines, making each new line shorter than its parent.

<figure data-construction-player="h-tree"></figure>

Each line gets two shorter lines at its ends. There are 1, 2, 4, 8 new lines at successive steps. Each new line is about 71% as long as the one before it. After two steps, the length has halved.

This arrangement has a practical use in circuits. Every endpoint at the same depth is connected to the center by an equally long route. An H-shaped wire layout can therefore distribute clock signals with matched wire lengths.<sup><a id="h-tree-ref-1" href="#h-tree-source-1">1</a></sup>

## Further reading

- [H tree — Wikipedia](https://en.wikipedia.org/wiki/H_tree)
- [H-fractal — MathWorld](https://mathworld.wolfram.com/H-Fractal.html)
- [Recursive tree background — The Nature of Code](https://natureofcode.com/fractals/#trees)

## Sources and notes

1. <span id="h-tree-source-1"></span> Princeton University, [COS 126 Recursive Graphics Assignment](https://www.cs.princeton.edu/courses/archive/fall02/cs126/assignments/htree.html), 2002. Explains H-tree circuit layouts with equal wire lengths from the central clock to exposed endpoints. [Back](#h-tree-ref-1)
