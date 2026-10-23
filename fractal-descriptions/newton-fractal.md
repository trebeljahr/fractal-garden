# Newton Fractal

Start Newton's method at every point in the complex plane. Color each point by the root its orbit approaches. For $f(z)=z^3-1$, the three roots are

$$
1,\qquad -\frac12+\frac{\sqrt3}{2}i,\qquad -\frac12-\frac{\sqrt3}{2}i.
$$

The update subtracts the function value divided by its derivative:

$$
z_{n+1}=z_n-\frac{z_n^3-1}{3z_n^2}=\frac{2z_n^3+1}{3z_n^2}.
$$

On the real graph, this uses the tangent's intersection with the horizontal axis as the next estimate. The complex calculation applies the same algebraic formula.

<figure data-lesson="newton"></figure>

Each root has a **basin of attraction**: all starting points whose iterates converge to it. Near a simple root, Newton's method converges quadratically. Roughly, the number of correct digits doubles each step once the estimate is close enough.<sup><a id="newton-fractal-ref-1" href="#newton-fractal-source-1">1</a></sup>

The three basins share one boundary. Every neighborhood of a boundary point contains starting values for all three roots. This explains why a border between two colors repeatedly reveals pieces of the third.<sup><a id="newton-fractal-ref-2" href="#newton-fractal-source-2">2</a></sup> Grant Sanderson's [animated explanation](https://www.youtube.com/watch?v=-RdOwhmqP5s) develops this boundary property from Newton's method.

A direct calculation explains the picture's rotational symmetry. If $\omega^3=1$, the Newton map satisfies $N(\omega z)=\omega N(z)$. A 120° rotation permutes the three roots and their basins.

At zero, the derivative vanishes and the update divides by zero. Nearby points can take large jumps. This renderer stops after at most 48 updates and assigns unresolved pixels their last point's nearest root. Their color therefore does not establish convergence.

The boundary is itself the Julia set of this rational Newton map. The [quadratic Julia explorer](/julia-set) uses a different iterated function.

## Sources and notes

1. <span id="newton-fractal-source-1"></span> Marco Abate, [À la recherche des racines perdues (In Search of Lost Roots)](https://arpi.unipi.it/bitstream/11568/777953/1/Abate_Newton2.pdf), lecture of 23 March 2013, sections 1–2. Explains tangent iteration, local quadratic convergence, and basins. [Back](#newton-fractal-ref-1)
2. <span id="newton-fractal-source-2"></span> Abate, same lecture, section 3. Explains the common basin boundary and Fatou's work. See also Grant Sanderson, [Newton's Fractal](https://www.3blue1brown.com/lessons/newtons-fractal/), 3Blue1Brown video lesson, 12 October 2021, especially 17:56 onward. The rotational identity above is a direct derivation. [Back](#newton-fractal-ref-2)
