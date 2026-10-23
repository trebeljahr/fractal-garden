# Lorenz Attractor

Follow one point as it loops around two wings. It can circle one wing several times before crossing to the other.

Start a second point almost in the same place. At first, the trails stay close. Later, one can switch wings while the other keeps circling. A tiny difference at the start changes the journey.

<figure data-lesson="lorenz"></figure>

Edward Lorenz found this behavior in a simplified model of moving heat in 1963. The three numbers describe circulation and temperature changes.<sup><a id="lorenz-attractor-ref-1" href="#lorenz-attractor-source-1">1</a></sup> The butterfly shows how those numbers change together. It is not a butterfly-shaped route through the air.

## No dice, but hard to predict

The rules contain no randomness. Each position decides the next move. Yet a small uncertainty in the starting position can grow until a detailed prediction fails.

The two trails do not have to move farther apart at every moment. Watch them separate, come closer, then separate again.

Warwick Tucker later proved that the classic equations really support this chaotic attractor. He used calculations that bound their own numerical errors.<sup><a id="lorenz-attractor-ref-2" href="#lorenz-attractor-source-2">2</a></sup>

## The rule behind the trail

These equations give the point's speed in each direction:

$$
\frac{dx}{dt}=\sigma(y-x),\qquad
\frac{dy}{dt}=x(\rho-z)-y,\qquad
\frac{dz}{dt}=xy-\beta z.
$$

The defaults are $\sigma=10$, $\rho=28$ and $\beta=8/3$. Changing them can change the motion completely.

The computer approximates the trail in small time steps. Halve **Time step** and double **Steps** to compare the same duration with finer steps.

The [Rössler attractor](/rossler-attractor) loops around one main spiral. The [logistic map](/logistic-map) reaches chaos by repeatedly updating a single number.

## Sources and notes

1. <span id="lorenz-attractor-source-1"></span> Edward N. Lorenz, [Deterministic Nonperiodic Flow](https://www.lmd.polytechnique.fr/~dubos/Cours/PRL/Lorenz63.pdf), *Journal of the Atmospheric Sciences* 20 (1963), 130–141, especially section 5. Derives the three-variable convection model and identifies its variables. [Back](#lorenz-attractor-ref-1)
2. <span id="lorenz-attractor-source-2"></span> Warwick Tucker, [A Rigorous ODE Solver and Smale's 14th Problem](https://research.monash.edu/en/publications/a-rigorous-ode-solver-and-smales-14th-problem/), *Foundations of Computational Mathematics* 2 (2002), 53–117. Reports the proof with directed rounding and interval arithmetic. [Back](#lorenz-attractor-ref-2)
