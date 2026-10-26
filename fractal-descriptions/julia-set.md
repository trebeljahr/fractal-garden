# Julia Set

Choose one number to add, called $c$. Every pixel starts a calculation from its own position. Square the position, add $c$, then repeat using the result.

A position has two coordinates: horizontal and vertical. Squaring multiplies its distance from zero by itself and doubles its angle from the line pointing right. Adding $c$ shifts the result by the same horizontal and vertical amounts each time.

<figure data-article-images="julia"></figure>

Start with $c=0$, so nothing is added. A point half a unit from zero gets closer with each squaring: $0.5$, then $0.25$, then $0.0625$. A point more than one unit away gets farther away. The dividing line is a circle of radius one.<sup><a id="julia-set-ref-1" href="#julia-set-source-1">1</a></sup>

The example below starts with this circle. Choose a pixel inside it, then one outside it, and follow each calculation. The ring marks the starting pixel. Its color comes from whether the results escape, and how long that takes.

<figure data-orbit="julia"></figure>

The points that stay within a fixed distance of zero forever form the **filled Julia set**. Its edge is the **Julia set**. For $c=0$, the filled set includes the circle and everything inside it. Choose **Add −1** to see what changing $c$ does to the shape.

The [Mandelbrot set](/mandelbrot) tells you whether a choice of $c$ gives a connected Julia set. Inside the Mandelbrot set, the Julia set is connected. Outside, it breaks into separated dust.<sup><a id="julia-set-ref-2" href="#julia-set-source-2">2</a></sup>

Dark pixels have not escaped before the computer's step limit. Some may escape later. Raising the limit can resolve those slow cases.

## Further reading

- [Julia set — Wikipedia](https://en.wikipedia.org/wiki/Julia_set)
- [Introduction to Complex Dynamics — Cornell Math Explorers’ Club](https://pi.math.cornell.edu/~lipa/mec/lesson5.html)

## Sources and notes

1. <span id="julia-set-source-1"></span> [Introduction to Complex Dynamics](https://pi.math.cornell.edu/~lipa/mec/lesson5.html). [Back](#julia-set-ref-1)
2. <span id="julia-set-source-2"></span> [Local Connectivity of Julia Sets and Bifurcation Loci: Three Theorems of J.-C. Yoccoz](https://pi.math.cornell.edu/~hubbard/hubbard.pdf). [Back](#julia-set-ref-2)
