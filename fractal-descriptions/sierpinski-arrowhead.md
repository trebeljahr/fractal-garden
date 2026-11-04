# Sierpinski Arrowhead

Draw a straight line. Replace it with three lines half as long, turning 60 degrees between them, so they start and end where the old line did. Now replace each of those three the same way, bending each one to the opposite side from the one before.<sup><a id="sierpinski-arrowhead-ref-1" href="#sierpinski-arrowhead-source-1">1</a></sup>

<figure data-construction-player="sierpinski-arrowhead"></figure>

Press **Line only** at level 7. The line has the holes of the [Sierpinski triangle](/l-system/sierpinski-triangle), yet that triangle comes from removing the middle of every triangle. Press **Triangles** to see what is left of it at each level. **Lines** and **Small triangles** always match, because each line is one side of one triangle.

Go to level 4 and drag **Draw**. The pen draws one side, which ends on a corner of the next triangle, and goes on from there. It passes through every triangle once without lifting.

To go up a level, divide each triangle into four and remove the middle one, which leaves three. The triangle's line bends inward and becomes three lines, one side of each new triangle. The triangles lie on alternate sides of the pen, so the bends alternate.

In every drawing, each triangle has one corner the pen doesn't touch. The white dot is one of these corners, shared by two triangles. At level 4, **Draw** 13 puts the pen at the first of them and **Draw** 67 at the second. In both, it draws the side across from the dot, so the line stays one small triangle's height away. Go up a level and the triangles halve, so **Line to dot** halves too.

No drawing ever touches itself. Repeat forever and that distance shrinks to zero, so the finished curve passes through the dot twice: one sixth of the way along and again five sixths of the way along.<sup><a id="sierpinski-arrowhead-ref-2" href="#sierpinski-arrowhead-source-2">2</a></sup> The same is true of every corner where two triangles touch and the pen doesn't cross.

## Further exploring

### Videos

- [The Plotting of Beautiful Curves — Numberphile](https://www.youtube.com/watch?v=kMBj2fp52tA)
- [Developing Sierpinski arrowhead curve — Henry Segerman](https://www.youtube.com/watch?v=bnLc6rHVzb0)
- [Strip Folding Fractal Curves — Robert Fathauer](https://www.youtube.com/watch?v=qTyj2ta9ryk)

### Reading

- [Sierpiński arrowhead curve — Wikipedia](https://en.wikipedia.org/wiki/Sierpi%C5%84ski_curve#Arrowhead_curve)
- [Sierpiński arrowhead curve — MathWorld](https://mathworld.wolfram.com/SierpinskiArrowheadCurve.html)

## Sources and notes

1. <span id="sierpinski-arrowhead-source-1"></span> [The Algorithmic Beauty of Plants, chapter 1](https://algorithmicbotany.org/papers/abop/abop-ch1.lowquality.pdf), Figure 1.10b on p. 11. [Back](#sierpinski-arrowhead-ref-1)
2. <span id="sierpinski-arrowhead-source-2"></span> Calculation: the pen reaches a triangle's untouched corner halfway through that triangle, because the corner stays untouched in the middle one of its three smaller triangles, level after level. At level 2, the dot is the untouched corner of the first triangle and the last. Halfway through those is one sixth and five sixths of the way along. [Back](#sierpinski-arrowhead-ref-2)
