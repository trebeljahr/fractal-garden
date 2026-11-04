# Gosper Curve

The Gosper curve joins seven smaller copies of the previous round's path, which the figure tints. Each copy is turned so it starts where the last one ends. Four run the same way as the previous path and three run backward along it, and all turns are multiples of 60 degrees.<sup><a id="gosper-curve-ref-1" href="#gosper-curve-source-1">1</a></sup>

<figure data-construction-player="gosper-curve"></figure>

Seven copies mean each step multiplies the number of segments by seven: 1, 7, 49, 343. The distance between the endpoints stays fixed, which makes each copy $1/\sqrt7$ times the size of the whole, about 38%, and each new segment shrinks by that same factor.

The path covers more of the enclosed region as the segments get smaller, and its infinite image fills a shape called the [Gosper island](/gosper-island). The island itself can be divided into seven smaller copies in the same arrangement.

The computer uses F for drawing and two other letters to choose each copy's direction: X grows into a copy that runs forward, and Y into one that runs backward. Each X or Y produces seven new X/Y instructions, and the existing F steps remain to connect them.

The [Hilbert curve](/l-system/hilbert-curve) also fills a region, but it divides a square into four smaller square regions, while the Gosper construction uses an arrangement based on 60-degree directions.

## Further exploring

- [Gosper curve — Wikipedia](https://en.wikipedia.org/wiki/Gosper_curve)
- [Peano-Gosper curve — MathWorld](https://mathworld.wolfram.com/Peano-GosperCurve.html)
- [Flowsnake — Larry Riddle](https://larryriddle.agnesscott.org/ifs/ksnow/flowsnake.htm)
- [Flowsnake Earth — Bridges](https://archive.bridgesmathart.org/2017/bridges2017-237.html)

## Sources and notes

1. <span id="gosper-curve-source-1"></span> Bielefeld University, [Gosper Curve Substitution Tiling](https://tilings.math.uni-bielefeld.de/substitution/gosper_curve/), Tilings Encyclopedia. Confirms Gosper’s attribution, the substitution and inflation factor √7. [Back](#gosper-curve-ref-1)
