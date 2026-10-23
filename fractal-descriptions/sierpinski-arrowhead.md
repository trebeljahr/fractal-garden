# Sierpinski Arrowhead

The arrowhead is one connected path whose smaller parts surround triangular gaps. Each segment is replaced by three segments, and each turn is 60 degrees.<sup><a id="sierpinski-arrowhead-ref-1" href="#sierpinski-arrowhead-source-1">1</a></sup>

<figure data-construction-player="sierpinski-arrowhead"></figure>

One notation starts with A and uses:

```text
A → B-A-B
B → A+B+A
```

Both letters draw forward. The two rules make the three-part replacement face in opposite directions. This lets neighboring pieces connect while leaving the larger triangular gaps open.

Each replacement triples the segment count. Halving the new segment lengths keeps the distance between the endpoints fixed. Repeating the construction approaches the same set as the [Sierpinski triangle](/l-system/sierpinski-triangle), but through a continuous path instead of removing filled triangles.

The path's overall orientation alternates between odd and even stages. This page rotates alternate stages to keep them in comparable positions.

The main drawing uses an equivalent notation where F draws and X/Y control later replacements. It produces the same segment counts: 1, 3, 9, 27.

## Sources and notes

1. <span id="sierpinski-arrowhead-source-1"></span> Przemysław Prusinkiewicz and Aristid Lindenmayer, [The Algorithmic Beauty of Plants, chapter 1](https://algorithmicbotany.org/papers/abop/abop-ch1.lowquality.pdf), Springer-Verlag, 1990. Figure 1.10 and section 1.4 describe a recursive route through the Sierpiński gasket. [Back](#sierpinski-arrowhead-ref-1)
