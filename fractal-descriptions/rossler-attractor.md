# Rössler Attractor

The Rössler system calculates three changing coordinates. Its trail makes an outward spiral, rises out of the spiral's plane, then returns toward the center.

The top view shows the spiral. The side view shows the changes in height that are harder to see from above. Both views use the same calculation.

<figure data-lesson="rossler"></figure>

The rules give the speed in each coordinate:

$$
\frac{dx}{dt}=-y-z,\qquad
\frac{dy}{dt}=x+ay,\qquad
\frac{dz}{dt}=b+z(x-c).
$$

The defaults are $a=0.2$, $b=0.2$ and $c=5.7$, as in Rössler's 1976 paper.<sup><a id="rossler-attractor-ref-1" href="#rossler-attractor-source-1">1</a></sup>

When $z$ is small, the first two rules produce the outward circling motion. In the third rule, the factor $x-c$ changes from negative to positive as $x$ passes $c$. Positive height can then increase quickly. The $-z$ term in the first rule also changes the horizontal motion, helping bring the point inward.

Two lines crossing in the top view need not occupy the same position in space. Their heights may differ. Comparing the views helps distinguish a projected crossing from a repeated three-dimensional position.

Nearby starts can produce different later trails. As with the [Lorenz system](/lorenz-attractor), changing parameters can also replace chaotic motion with repeating behavior.

## Sources and notes

1. <span id="rossler-attractor-source-1"></span> Otto E. Rössler, [An Equation for Continuous Chaos](https://www.chaotic-circuits.com/wp-content/uploads/2015/01/AN-EQUATION-FOR-CONTINUOUS-CHAOS_ROSSLER.pdf), *Physics Letters A* 57(5), 12 July 1976, 397–398. Gives the default equations, one-nonlinearity motivation, and spiral/fold construction. [Back](#rossler-attractor-ref-1)
