# Jerusalem Cube

Every cube leaves eight corner cubes and twelve smaller edge cubes. Cross-shaped passages replace the square tunnels of the [Menger sponge](/menger-sponge). Eric Baird dates his construction to 2010.<sup><a id="jerusalem-cube-ref-1" href="#jerusalem-cube-source-1">1</a></sup>

<figure data-investigation="jerusalem-cube"></figure>

## Two scales, one edge

Let a corner cube have side ratio $k$. The edge cube between two corner cubes has ratio $k^2$. They fit because

$$
2k+k^2=1,\qquad k=\sqrt2-1.
$$

The two ratios are approximately $0.4142$ and $0.1716$. Each smaller cube repeats both sizes, so the construction never reduces to a uniform three-by-three grid.

The viewer counts **rank**, rather than replacing every cube once per displayed iteration. Corner children gain one rank. Edge children gain two. A cube keeps splitting until its rank reaches the selected level. That makes the smallest visible cubes differ in side length by at most a factor of $1/k$.

The disjoint cube interiors give the dimension equation:<sup><a id="jerusalem-cube-ref-2" href="#jerusalem-cube-source-2">2</a></sup>

$$
8k^D+12k^{2D}=1.
$$

Put $x=k^D$. Then $12x^2+8x-1=0$, so $x=(\sqrt7-2)/6$ and $D\approx2.529$. Counting twenty copies without their two sizes would give the wrong dimension.

If every cube undergoes one complete replacement, the retained volume fraction is $8k^3+12k^6\approx0.629$. Repeating complete replacements drives volume to zero. This volume formula uses full generations, not the viewer's rank levels.

Baird calls its face-on parallel shadow the **Jerusalem square**.<sup><a id="jerusalem-cube-ref-3" href="#jerusalem-cube-source-3">3</a></sup> Front and back cubes overlap in that projection. Perspective views in the explorer change their apparent sizes.

## Sources and notes

1. <span id="jerusalem-cube-source-1"></span> Eric Baird, [Jerusalem Cube](https://www.coroflot.com/erkdemon/Jerusalem-Cube), creator’s portfolio. Baird states that he devised it in 2010, before his 2011 blog description. [Back](#jerusalem-cube-ref-1)
2. <span id="jerusalem-cube-source-2"></span> John E. Hutchinson, [Fractals and Self-Similarity](https://maths-people.anu.edu.au/~john/Assets/Research%20Papers/fractals_self-similarity.pdf), Indiana University Mathematics Journal 30 (1981), §§3 and 5. Separation and dimension theorem; numerical results here follow from the displayed rule. [Back](#jerusalem-cube-ref-2)
3. <span id="jerusalem-cube-source-3"></span> Eric Baird, [The Jerusalem Square](https://alt-fractals.blogspot.com/2011/11/jerusalem-square.html), 30 November 2011. Irrational scale ratio and the cube’s shadow. [Back](#jerusalem-cube-ref-3)
