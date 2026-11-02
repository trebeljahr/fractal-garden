# Peano Curve

In 1890, Giuseppe Peano showed that a single unbroken line can pass through every point of a square, even though a line has no width. His paper has no picture. It defines the curve with base-3 digits.<sup><a id="peano-curve-ref-1" href="#peano-curve-source-1">1</a></sup>

You can build it with a pen. Divide a square into nine smaller squares. Visit them in an S: along the bottom row, back along the middle row, along the top row. Then replace each small square's straight stretch with a copy of the same S, mirrored so its end meets the start of the next copy.

<figure data-construction-player="peano-curve"></figure>

Every round multiplies the number of lines by nine and divides their length by three. So the route gets three times longer each round, and every point of the square ends up closer to it. In the limit, the route passes through all of them.

Slide along the line to see where each position lands.

<figure data-lesson="peano-fill"></figure>

Now press **Visited twice**. Two different places on the line land on one dot. **Visited four times** finds a dot reached from four places. Peano noted the same counts in 1890: two or four.<sup><a id="peano-curve-ref-2" href="#peano-curve-source-1">1</a></sup>

The curve has no choice. A continuous line that covers a whole square must pass through some points more than once.<sup><a id="peano-curve-ref-3" href="#peano-curve-source-2">2</a></sup> The finished curve touches itself at these points, even though the drawing at every round looks like a route that never crosses.

The [Hilbert curve](/l-system/hilbert-curve) fills a square too. Hilbert published it a year after Peano, with drawings.<sup><a id="peano-curve-ref-4" href="#peano-curve-source-3">3</a></sup> It divides into four squares each round and rotates its copies, while Peano's divides into nine and mirrors them.

## Further exploring

- [Peano curve — Wikipedia](https://en.wikipedia.org/wiki/Peano_curve)
- [Peano Curve — MathWorld](https://mathworld.wolfram.com/PeanoCurve.html)

## Sources and notes

1. <span id="peano-curve-source-1"></span> [Sur une courbe, qui remplit toute une aire plane](https://gdz.sub.uni-goettingen.de/download/pdf/PPN235181684_0036/LOG_0013.pdf), in French: base-3 digits on p. 157, two or four positions on p. 160. [Back](#peano-curve-ref-1) [Back](#peano-curve-ref-2)
2. <span id="peano-curve-source-2"></span> [A Space-Filling Curve](https://faculty.etsu.edu/gardnerr/5357/notes/Munkres-44.pdf), p. 1, on Netto's theorem. [Back](#peano-curve-ref-3)
3. <span id="peano-curve-source-3"></span> [Ueber die stetige Abbildung einer Linie auf ein Flächenstück](https://gdz.sub.uni-goettingen.de/download/pdf/PPN235181684_0038/LOG_0040.pdf), in German. [Back](#peano-curve-ref-4)
