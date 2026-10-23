# Sierpinski Arrowhead

Can you draw the [Sierpinski triangle](/l-system/sierpinski-triangle) with one continuous path?

The arrowhead does it by replacing each part with three smaller parts. The path bends around triangular gaps that keep appearing at smaller sizes.<sup><a id="sierpinski-arrowhead-ref-1" href="#sierpinski-arrowhead-source-1">1</a></sup>

<figure data-construction-player="sierpinski-arrowhead"></figure>

One way to write the instructions starts with A:

```text
A → B-A-B
B → A+B+A
```

Both letters draw forward. Plus and minus turn by 60 degrees. A and B choose opposite ways to bend the three-part route.

Each round triples the number of lines. Each new line is half as long, keeping the distance between the ends fixed.

The main drawing uses an equivalent set of instructions with extra letters that do not draw. It makes the same number of lines: 1, 3, 9, 27.

The whole pattern changes direction between odd and even rounds. The page rotates alternate stages so you can compare them in the same position.

The [Sierpinski curve](/l-system/sierpinski-curve) shares the name but winds around square gaps instead.

## Sources and notes

1. <span id="sierpinski-arrowhead-source-1"></span> Przemysław Prusinkiewicz and Aristid Lindenmayer, [The Algorithmic Beauty of Plants, chapter 1](https://algorithmicbotany.org/papers/abop/abop-ch1.lowquality.pdf), Springer-Verlag, 1990. Figure 1.10 and section 1.4 describe a recursive route through the Sierpiński gasket. The equivalent letter rules, line counts and display rotations describe this explorer. [Back](#sierpinski-arrowhead-ref-1)
