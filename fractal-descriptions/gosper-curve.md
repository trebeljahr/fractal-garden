# Gosper Curve

The Gosper curve joins seven smaller copies of a path. Each copy is rotated to connect its end to the next copy's start. All turns are multiples of 60 degrees.<sup><a id="gosper-curve-ref-1" href="#gosper-curve-source-1">1</a></sup>

<figure data-construction-player="gosper-curve"></figure>

Each step multiplies the number of segments by seven: 1, 7, 49, 343. Each new segment is $1/\sqrt7$ times the previous length, about 38%, when the distance between the endpoints stays fixed.

The path covers more of the enclosed region as the segments get smaller. Its infinite image fills a shape called the Gosper island. The island itself can be divided into seven smaller copies in the same arrangement.

The computer uses F for drawing and two other letters, X and Y, for choosing the arrangement at the next step. Each X or Y produces seven new X/Y instructions. Existing F steps remain to connect them.

The [Hilbert curve](/l-system/hilbert-curve) also fills a region, but divides a square into four smaller square regions. The Gosper construction uses a different arrangement based on 60-degree directions.

## Sources and notes

1. <span id="gosper-curve-source-1"></span> Bielefeld University, [Gosper Curve Substitution Tiling](https://tilings.math.uni-bielefeld.de/substitution/gosper_curve/), Tilings Encyclopedia. Confirms Gosper’s attribution, the substitution and inflation factor √7. [Back](#gosper-curve-ref-1)
