# Gosper Curve

One winding path can fill an island. The Gosper curve does it with seven smaller copies of its route, joined using 60-degree turns.<sup><a id="gosper-curve-ref-1" href="#gosper-curve-source-1">1</a></sup>

Take a step through the construction. Each round adds smaller bends between the same two ends.

<figure data-construction-player="gosper-curve"></figure>

The line count goes 1, 7, 49, 343. To keep the ends in place, each new line is about 38% as long as the old one.

The finished island can also split into seven smaller copies of itself. Every finite path leaves gaps. The path fills the island only in the infinite limit.

“Flowsnake” is another name for it. Martin Gardner wrote about Gosper's construction in his December 1976 *Mathematical Games* column.<sup><a id="gosper-curve-ref-2" href="#gosper-curve-source-2">2</a></sup>

## Instructions for the pen

Start with `XF` and use:

```text
X → X+YF++YF-FX--FXFX-YF+
Y → -FX+YFYF++YF+FX--FX-Y
```

F draws forward. Plus and minus turn by 60 degrees. X and Y add instructions for the next round without drawing lines themselves.

The [Hilbert curve](/l-system/hilbert-curve) also fills a region, using four square-shaped routes instead of seven copies in this arrangement.

## Sources and notes

1. <span id="gosper-curve-source-1"></span> Bielefeld University, [Gosper Curve Substitution Tiling](https://tilings.math.uni-bielefeld.de/substitution/gosper_curve/), Tilings Encyclopedia. Confirms Gosper’s attribution, the substitution and inflation factor √7. The local stroke count follows from the displayed productions. [Back](#gosper-curve-ref-1)
2. <span id="gosper-curve-source-2"></span> Martin Gardner, [Mathematical Games](https://doi.org/10.1038/scientificamerican1276-124), Scientific American 235(6), 124–133, December 1976, as catalogued by the Bielefeld entry above. The curve’s area-filling construction also appears in Gardner’s [Penrose Tiles to Trapdoor Ciphers](https://rexresearch1.com/GardnerMath/PenrosetilestrapdoorciphersGardner.pdf), chapter 1. [Back](#gosper-curve-ref-2)
