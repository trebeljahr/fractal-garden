# Terdragon

Replace one line with three. Turn 120 degrees one way between the first two, then 120 degrees back between the last two. Repeat on every new line.

The line count grows 1, 3, 9, 27. The bends make a winding path on a triangular grid.

<figure data-construction-player="terdragon"></figure>

The drawing rule is:

```text
F → F+F-F
```

F draws forward. Plus and minus turn in opposite directions.

Those three steps finish about 1.732 step lengths from the start. Make each new step $1/\sqrt3$ of the old length to keep the distance between the ends fixed.<sup><a id="terdragon-ref-1" href="#terdragon-source-1">1</a></sup>

The route's overall direction turns by 30 degrees with each round. The renderer turns it back so the ends stay horizontally aligned.

Every point in the infinite shape can be described by choosing one of three smaller pieces, then one of its three pieces, and so on. That sequence works like an address inside the fractal.

The [Dragon curve](/l-system/dragon-curve) uses two pieces and right-angle turns. The [Twindragon](/l-system/twindragon) joins two dragons end to end.

## Sources and notes

1. <span id="terdragon-source-1"></span> Tobey Mathis and Kiko Kawamura, [Revolving sequences and Terdragon](https://arxiv.org/html/2106.10549), arXiv:2106.10549, 2021. Section 3 gives the terdragon’s three contraction maps, each of modulus 1/√3, and its ternary revolving sequences. The vector sum, stroke count and display counter-rotation are direct derivations from the renderer. [Back](#terdragon-ref-1)
