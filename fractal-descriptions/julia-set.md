# Julia Set

Every pixel starts a calculation from its own position. Square that position, add a fixed number $c$, then repeat using the result.

Some starting points escape farther and farther away. Others stay within a fixed distance of zero. The picture colors the starting points according to what their calculations do.

<figure data-article-images="julia"></figure>

For $c=0$, you only square. Squaring a distance smaller than one makes it smaller: $0.5$ becomes $0.25$, then $0.0625$. A distance larger than one grows. The dividing line is a circle of radius one.<sup><a id="julia-set-ref-1" href="#julia-set-source-1">1</a></sup>

The points inside that circle form the **filled Julia set**. Its edge is the **Julia set**. Other choices of $c$ can stretch that simple edge into the shapes shown here.

<figure data-orbit="julia"></figure>

In the diagram, $c$ stays fixed while you change the starting point. Two nearby starts can have very different outcomes. Try moving a start across the boundary and follow where it goes.

The [Mandelbrot set](/mandelbrot) tells you whether a choice of $c$ gives a connected Julia set. Inside the Mandelbrot set, the Julia set is connected. Outside, it breaks into separated dust.<sup><a id="julia-set-ref-2" href="#julia-set-source-2">2</a></sup>

Dark pixels have not escaped before the computer's step limit. Some may escape later. Raising the limit can resolve those slow cases.

## Sources and notes

1. <span id="julia-set-source-1"></span> Chris Lipa, [Introduction to Complex Dynamics](https://pi.math.cornell.edu/~lipa/mec/lesson5.html), Cornell Math Explorers' Club, undated teaching notes. Defines filled Julia sets and explains the unit-circle example. [Back](#julia-set-ref-1)
2. <span id="julia-set-source-2"></span> John H. Hubbard, [Local Connectivity of Julia Sets and Bifurcation Loci: Three Theorems of J.-C. Yoccoz](https://pi.math.cornell.edu/~hubbard/hubbard.pdf), *Topological Methods in Modern Mathematics* (1993), 467–511, introduction. States the equivalence between bounded critical orbit and connected filled Julia set. Lipa's notes also explain the Cantor alternative. [Back](#julia-set-ref-2)
