# Julia Set

Fix one complex number $c$. Every pixel supplies a different starting point $z_0$, then follows the same recurrence:

$$
z_{n+1}=z_n^2+c.
$$

Squaring squares the distance from zero and doubles the angle. Adding $c$ shifts the result. Repeating these operations separates starting points with bounded orbits from those that escape.

<figure data-article-images="julia"></figure>

The **filled Julia set** contains all starting points with bounded orbits. Its boundary is the **Julia set**. For $c=0$, the filled set is the closed unit disk, and its boundary is a circle. Points inside approach zero. Points outside escape. Points on the circle stay there as their angles double.<sup><a id="julia-set-ref-1" href="#julia-set-source-1">1</a></sup>

For this quadratic family, one orbit decides connectedness: start at the critical point $0$. If its orbit stays bounded, the Julia set is connected. If it escapes, the Julia set is a Cantor set, a completely disconnected dust. The [Mandelbrot set](/mandelbrot) records precisely the connected parameters.<sup><a id="julia-set-ref-2" href="#julia-set-source-2">2</a></sup>

In the diagram, $c=-0.8+0.156i$ stays fixed while the starting point changes.

<figure data-orbit="julia"></figure>

There is also an exact symmetry you can derive from the formula. Since $(-z)^2=z^2$, opposite starting points share every iterate after the first. The filled set and its boundary therefore have half-turn symmetry for every $c$. A particular palette can obscure it.

**Smooth escape time** describes escaping orbits. Dark pixels approximate the filled set at a finite iteration limit, which can leave slow escapes unresolved. **Orbit trap** instead measures the orbit's closest approach to the origin. Neither palette changes the mathematical set.

## Sources and notes

1. <span id="julia-set-source-1"></span> Chris Lipa, [Introduction to Complex Dynamics](https://pi.math.cornell.edu/~lipa/mec/lesson5.html), Cornell Math Explorers' Club, undated teaching notes. Defines filled Julia sets and explains the unit-circle example. [Back](#julia-set-ref-1)
2. <span id="julia-set-source-2"></span> John H. Hubbard, [Local Connectivity of Julia Sets and Bifurcation Loci: Three Theorems of J.-C. Yoccoz](https://pi.math.cornell.edu/~hubbard/hubbard.pdf), *Topological Methods in Modern Mathematics* (1993), 467–511, introduction. States the equivalence between bounded critical orbit and connected filled Julia set. Lipa's notes also explain the Cantor alternative. The half-turn argument above is a direct derivation. [Back](#julia-set-ref-2)
