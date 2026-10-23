# Julia Set

Pick a number $c$ and keep it fixed. Now put a point anywhere on the picture. Square its position, add $c$, and repeat.

Some starting points run away. Others stay nearby. Color them by what happens, and a Julia picture appears.

$$
z_{n+1}=z_n^2+c.
$$

Here $z$ gives a point's horizontal and vertical position as one complex number. Every pixel tries the same rule from a different start.

<figure data-article-images="julia"></figure>

Try $c=0$. Points inside a unit circle move toward the center. Points outside run away. Points on the circle stay on it.<sup><a id="julia-set-ref-1" href="#julia-set-source-1">1</a></sup>

The points that stay nearby form the **filled Julia set**. Its edge is the **Julia set**. For $c=0$, that means a filled disk and its circular edge.

## One piece or scattered dust?

Change $c$. Some pictures stay connected. Others break into dust.

The [Mandelbrot set](/mandelbrot) tells you which happens. Choose $c$ inside it and the Julia set is connected. Choose $c$ outside it and the Julia set breaks apart.<sup><a id="julia-set-ref-2" href="#julia-set-source-2">2</a></sup>

The small diagram keeps $c=-0.8+0.156i$ fixed. Move the starting point and follow its journey.

<figure data-orbit="julia"></figure>

Each picture has half-turn symmetry. Opposite starting points become the same point after squaring, so the rest of their journeys match.

**Smooth escape time** colors how quickly points escape. Dark pixels have not escaped before the time limit. **Orbit trap** uses how close a journey comes to the origin instead. Changing the colors leaves the rule unchanged.

## Sources and notes

1. <span id="julia-set-source-1"></span> Chris Lipa, [Introduction to Complex Dynamics](https://pi.math.cornell.edu/~lipa/mec/lesson5.html), Cornell Math Explorers' Club, undated teaching notes. Defines filled Julia sets and explains the unit-circle example. [Back](#julia-set-ref-1)
2. <span id="julia-set-source-2"></span> John H. Hubbard, [Local Connectivity of Julia Sets and Bifurcation Loci: Three Theorems of J.-C. Yoccoz](https://pi.math.cornell.edu/~hubbard/hubbard.pdf), *Topological Methods in Modern Mathematics* (1993), 467–511, introduction. States the equivalence between bounded critical orbit and connected filled Julia set. Lipa's notes also explain the Cantor alternative. The half-turn argument above is a direct derivation. [Back](#julia-set-ref-2)
