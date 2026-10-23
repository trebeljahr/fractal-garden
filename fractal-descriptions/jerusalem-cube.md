# Jerusalem Cube

Look at the holes. They look like crosses, with smaller crosses inside them.

Each cube becomes eight corner cubes and twelve smaller cubes along the edges. Repeat inside all twenty. Eric Baird devised this construction in 2010.<sup><a id="jerusalem-cube-ref-1" href="#jerusalem-cube-source-1">1</a></sup>

<figure data-construction-player="jerusalem-cube"></figure>

## Two sizes of cube

The corner cubes are about 41% as wide as their parent. The cubes between them are about 17% as wide. Two corners and one small edge cube fit along an old edge.

The exact corner size is $k=\sqrt2-1$. The edge size is $k^2$. They fit because:

$$
2k+k^2=1.
$$

Both sizes repeat inside every child. That makes this different from the [Menger sponge](/menger-sponge), where all the children have the same size.

The level control accounts for those two sizes. A small edge cube counts as two levels of shrinking. A larger corner cube counts as one.

The amount left depends on both cube sizes, not only the count of twenty.<sup><a id="jerusalem-cube-ref-2" href="#jerusalem-cube-source-2">2</a></sup> Each round removes more material. After endlessly repeating the cuts, the remaining volume is zero.

Viewed straight at a face with parallel rays, the cube casts a flat pattern Baird calls the **Jerusalem square**.<sup><a id="jerusalem-cube-ref-3" href="#jerusalem-cube-source-3">3</a></sup> Turn the cube to see how the cross-shaped passages meet inside.

## Sources and notes

1. <span id="jerusalem-cube-source-1"></span> Eric Baird, [Jerusalem Cube](https://www.coroflot.com/erkdemon/Jerusalem-Cube), creator’s portfolio. Baird states that he devised it in 2010, before his 2011 blog description. [Back](#jerusalem-cube-ref-1)
2. <span id="jerusalem-cube-source-2"></span> John E. Hutchinson, [Fractals and Self-Similarity](https://maths-people.anu.edu.au/~john/Assets/Research%20Papers/fractals_self-similarity.pdf), Indiana University Mathematics Journal 30 (1981), §§3 and 5. Separation and dimension theorem; numerical results here follow from the displayed rule. [Back](#jerusalem-cube-ref-2)
3. <span id="jerusalem-cube-source-3"></span> Eric Baird, [The Jerusalem Square](https://alt-fractals.blogspot.com/2011/11/jerusalem-square.html), 30 November 2011. Irrational scale ratio and the cube’s shadow. [Back](#jerusalem-cube-ref-3)
