# Terdragon

The Terdragon replaces a line with three lines. Draw forward, turn 120 degrees and draw again, then turn 120 degrees in the opposite direction and draw once more.

Repeat this replacement on every line in the new path.

<figure data-construction-player="terdragon"></figure>

The first and third steps point in the old direction. The middle step points 120 degrees away. Together, the three equal steps finish $\sqrt3$ step lengths from the start, about 1.732.<sup><a id="terdragon-ref-1" href="#terdragon-source-1">1</a></sup>

To keep the endpoint distance fixed, make each new step $1/\sqrt3$ of the old length. The number of lines triples each round while their lengths decrease by this factor.

The replacement also changes the overall direction between the endpoints by 30 degrees. The page rotates each new stage back so that the endpoints remain horizontally aligned.

Its drawing rule is `F → F+F-F`, where F draws forward. The [Dragon curve](/l-system/dragon-curve) instead uses two new lines and 90-degree turns.

## Sources and notes

1. <span id="terdragon-source-1"></span> Tobey Mathis and Kiko Kawamura, [Revolving sequences and Terdragon](https://arxiv.org/html/2106.10549), arXiv:2106.10549, 2021. Section 3 gives the terdragon’s three contraction maps, each of modulus 1/√3, and its ternary revolving sequences. The vector sum, stroke count and display counter-rotation are direct derivations from the renderer. [Back](#terdragon-ref-1)
