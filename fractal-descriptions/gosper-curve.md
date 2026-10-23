# Gosper Curve

The Gosper curve replaces one route with seven smaller routes on a triangular lattice. Its turns are multiples of 60 degrees. The limiting path fills a region called the Gosper island. That region can itself be assembled from seven reduced copies.<sup><a id="gosper-curve-ref-1" href="#gosper-curve-source-1">1</a></sup>

The main drawing starts with `XF` and uses:

```
X → X+YF++YF-FX--FXFX-YF+
Y → -FX+YFYF++YF+FX--FX-Y
```

Only F draws. X and Y choose how the next copies turn and connect.

<figure data-construction-player="gosper-curve"></figure>

Each production contains seven X/Y symbols and six new F strokes. Existing F strokes remain. Starting from one X and one F gives exactly $7^n$ strokes after $n$ rewrites.

The chord of a seven-stroke replacement spans $\sqrt{7}$ unit lengths. Each reduced copy therefore has scale $1/\sqrt{7}$, and $7(1/\sqrt{7})^2=1$. The same equation expresses area balance in the seven-piece island substitution.

“Flowsnake” is another name for the curve. Gardner introduced Gosper's construction in his December 1976 Mathematical Games column.<sup><a id="gosper-curve-ref-2" href="#gosper-curve-source-2">2</a></sup> Its hexagonal arrangement offers a different route to filling area from the four square pieces of the [Hilbert curve](/l-system/hilbert-curve).

## Sources and notes

1. <span id="gosper-curve-source-1"></span> Bielefeld University, [Gosper Curve Substitution Tiling](https://tilings.math.uni-bielefeld.de/substitution/gosper_curve/), Tilings Encyclopedia. Confirms Gosper’s attribution, the substitution and inflation factor √7. The local stroke count follows from the displayed productions. [Back](#gosper-curve-ref-1)
2. <span id="gosper-curve-source-2"></span> Martin Gardner, [Mathematical Games](https://doi.org/10.1038/scientificamerican1276-124), Scientific American 235(6), 124–133, December 1976, as catalogued by the Bielefeld entry above. The curve’s area-filling construction also appears in Gardner’s [Penrose Tiles to Trapdoor Ciphers](https://rexresearch1.com/GardnerMath/PenrosetilestrapdoorciphersGardner.pdf), chapter 1. [Back](#gosper-curve-ref-2)
