# Terdragon

The Terdragon replaces a line with three lines. Draw forward, turn 120 degrees and draw again, then turn 120 degrees in the opposite direction and draw once more.

Repeat this replacement on every line in the new path.

<figure data-construction-player="terdragon"></figure>

Every line points in one of three directions, so the path stays on a grid of triangles. It comes back to corners it has already passed through, but it never draws the same line twice. **Drawn twice** stays at 0 at every level.

Set the level to 4 and slide **Copies** up to 6. All the copies start at the same point, each turned 60 degrees from the last. Five copies leave a gap around the start. The sixth fills it without drawing over any other copy. Inside the white hexagon, every line of the grid is drawn. Raise the level and the hexagon grows.

If the lines keep their length and the levels never stop, the six copies draw every line of an endless grid exactly once. Each copy uses exactly one line in six. Chandler Davis and Donald Knuth showed this in 1970.<sup><a id="terdragon-ref-1" href="#terdragon-source-1">1</a></sup>

Here is why no line is drawn twice. Set the level to 1 and **Copies** to 1. The dim line is the old line. Picture a triangle with three equal sides standing on that line, and another hanging below it. The two middle corners of the new path are the centers of those triangles. The path looks the same from either end, so it doesn't matter which way a line is walked.

Now replace every line of a whole grid of triangles this way. The center of each triangle gets joined to its three corners and to the centers of its three neighbors. Those lines make a smaller grid of triangles, turned 30 degrees, and each of its lines comes from exactly one old line.<sup><a id="terdragon-ref-2" href="#terdragon-source-1">1</a></sup> So when no line is drawn twice at one level, none is drawn twice at the next. Six copies start as six different lines around one point, so this holds at every level.

To see this, set the level to 2 and **Copies** to 6. The dim lines make six triangles around the start, and the new lines meet at their centers.

Four [Dragon curves](/l-system/dragon-curve) fit around one point the same way, on a grid of squares.

## Further exploring

### Videos

- [Developing terdragon curve — Henry Segerman](https://www.youtube.com/watch?v=TrnnpVMbydI)
- [Strip Folding Fractal Curves — Robert Fathauer](https://www.youtube.com/watch?v=qTyj2ta9ryk)

### Reading

- [Terdragon — Wikipedia](https://en.wikipedia.org/wiki/Dragon_curve#Terdragon)
- [Terdragon — MathWorld](https://mathworld.wolfram.com/Terdragon.html)
- [Terdragon — Larry Riddle](https://larryriddle.agnesscott.org/ifs/heighway/terdragon.htm)
- [Terdragon Boundary — Larry Riddle](https://larryriddle.agnesscott.org/ifs/heighway/terdragonBoundary.htm)

## Sources and notes

1. <span id="terdragon-source-1"></span> [Iterations of the Terdragon Curve](https://downloads.tuxfamily.org/user42/terdragon/terdragon.pdf), section 1.1, which credits Davis and Knuth's 1970 paper and proves the result on this grid. [Back](#terdragon-ref-1) [Back](#terdragon-ref-2)
