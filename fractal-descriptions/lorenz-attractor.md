# Lorenz Attractor

A moving point traces a path through three-dimensional phase space. Its coordinates follow

$$
\frac{dx}{dt}=\sigma(y-x),\qquad
\frac{dy}{dt}=x(\rho-z)-y,\qquad
\frac{dz}{dt}=xy-\beta z.
$$

Edward Lorenz derived these equations from a severely simplified model of thermal convection in 1963. Here $x$ measures circulation intensity. The other variables describe temperature differences and distortion of the vertical temperature profile.<sup><a id="lorenz-attractor-ref-1" href="#lorenz-attractor-source-1">1</a></sup> The butterfly is a path through these variables, rather than a parcel's route through the air.

The defaults are $\sigma=10$, $\rho=28$ and $\beta=8/3$.

<figure data-lesson="lorenz"></figure>

A nearby start differs by 0.001 in $x$. Its distance from the first trajectory can grow and shrink. Sensitivity means sufficiently small initial uncertainty can eventually defeat a detailed prediction. It does not require separation to increase at every instant.

The equations combine local stretching with overall contraction. Their divergence is

$$
\nabla\cdot f=-\sigma-1-\beta=-\frac{41}{3}
$$

at the default parameters. By the phase-volume equation, a volume transported by this flow shrinks as $V(t)=V(0)e^{-41t/3}$. This is a direct calculation. A volume can stretch in one direction while it contracts overall.

Warwick Tucker later proved that the classical Lorenz equations support a strange attractor. His proof used interval arithmetic to bound numerical errors, rather than treating a plotted butterfly as proof.<sup><a id="lorenz-attractor-ref-2" href="#lorenz-attractor-source-2">2</a></sup>

The explorer uses fourth-order Runge–Kutta integration. Halving **Time step** and doubling **Steps** preserves duration while improving numerical resolution. Changing parameters changes the flow, and need not preserve its chaotic behavior.

The two small views are projections. A Poincaré section instead records crossings of a chosen plane. Compare the [Rössler attractor](/rossler-attractor) or the discrete [logistic map](/logistic-map).

## Sources and notes

1. <span id="lorenz-attractor-source-1"></span> Edward N. Lorenz, [Deterministic Nonperiodic Flow](https://www.lmd.polytechnique.fr/~dubos/Cours/PRL/Lorenz63.pdf), *Journal of the Atmospheric Sciences* 20 (1963), 130–141, especially section 5. Derives the three-variable convection model and identifies its variables. [Back](#lorenz-attractor-ref-1)
2. <span id="lorenz-attractor-source-2"></span> Warwick Tucker, [A Rigorous ODE Solver and Smale's 14th Problem](https://research.monash.edu/en/publications/a-rigorous-ode-solver-and-smales-14th-problem/), *Foundations of Computational Mathematics* 2 (2002), 53–117. Reports the proof with directed rounding and interval arithmetic. [Back](#lorenz-attractor-ref-2)
