# Rössler Attractor

One moving point follows three velocity equations:

$$
\frac{dx}{dt}=-y-z,\qquad
\frac{dy}{dt}=x+ay,\qquad
\frac{dz}{dt}=b+z(x-c).
$$

The defaults are $a=0.2$, $b=0.2$ and $c=5.7$. These are the values Otto Rössler used in his 1976 paper. He sought a simpler relative of the [Lorenz system](/lorenz-attractor), with one spiral and only one nonlinear product, $xz$. He described it as a model of a model, without an immediate physical interpretation.<sup><a id="rossler-attractor-ref-1" href="#rossler-attractor-source-1">1</a></sup>

<figure data-lesson="rossler"></figure>

The x–y view emphasizes the spiral. The x–z view reveals the rise and return that the overhead view hides. Both project the same three-dimensional trajectory.

The equations explain the spiral's expansion. Direct differentiation gives

$$
\frac{d}{dt}(x^2+y^2)=2ay^2-2xz.
$$

When $z$ is small and $a>0$, the first term tends to increase the squared distance in the x–y plane. An excursion in $z$ changes that balance. It also enters $dx/dt$ as $-z$, helping return the trajectory toward the inner spiral.

The height equation supplies the other part of the feedback. Its factor $x-c$ changes sign as $x$ crosses $c$. Positive $z$ can grow rapidly on one part of a circuit and shrink on another. The complete system produces the repeated stretch and fold.

A nearby starting point can eventually follow a different sequence of excursions. A projected crossing does not imply a return to the same full state, because the hidden coordinate can differ.

The explorer integrates from $(1,1,0)$ with fourth-order Runge–Kutta steps. **Time step** and **Steps** jointly determine simulated duration. Different parameters can produce periodic behavior, and a finite trail alone cannot establish chaos. The [logistic map](/logistic-map) shows another route between periodic and chaotic behavior.

## Sources and notes

1. <span id="rossler-attractor-source-1"></span> Otto E. Rössler, [An Equation for Continuous Chaos](https://www.chaotic-circuits.com/wp-content/uploads/2015/01/AN-EQUATION-FOR-CONTINUOUS-CHAOS_ROSSLER.pdf), *Physics Letters A* 57(5), 12 July 1976, 397–398. Gives the default equations, one-nonlinearity motivation, and spiral/fold construction. The radial derivative above is a direct derivation. [Back](#rossler-attractor-ref-1)
