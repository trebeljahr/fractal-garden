# Lorenz Attractor

Follow the trail around the butterfly's two wings. One moving point draws the whole path. It circles one wing, moves to the other, and leaves another loop behind.

## Build a trail one batch at a time

One point circles a wing, crosses to the other, and folds back. Two projections reveal different parts of that same three-dimensional path.

<figure data-lesson="lorenz"></figure>

The nearby start differs by 0.001 along the x-axis. Its separation uses all three coordinates, because a projection can hide part of the distance.

The equations give the point's velocity at its current position:

$$
\frac{dx}{dt} = \sigma (y - x), \qquad
\frac{dy}{dt} = x (\rho - z) - y, \qquad
\frac{dz}{dt} = x y - \beta z
$$

The default values are $\sigma = 10$, $\rho = 28$ and $\beta = 8/3$. The trail approaches a bounded region with repeated folding. Nearby starting points can follow different routes through that region. This sensitivity does not mean their distance grows at every step, or that every possible starting point behaves the same way.

## Sensitivity and numerical approximation

A numerical trajectory samples a continuous flow at finite time intervals. Its trail connects those samples into a visible curve.

The renderer uses fourth-order Runge–Kutta integration. A smaller time step can reduce numerical error over a fixed duration. To compare that duration, reduce **Time step** and increase **Steps** together. Chaotic trajectories can eventually separate even when both numerical approximations are useful.

Changing the parameter $\rho$ changes the flow itself. The butterfly at $\rho=28$ does not imply every parameter or starting point has the same behavior.

The trail is a curve through three-dimensional space. The gaps between passes remain empty. The [Rössler attractor](/rossler-attractor) makes another folded trajectory. The [logistic map](/logistic-map) explores changing behavior through a recurrence with one variable.

## Crossings in a shadow can hide separation

The familiar butterfly is a projection of a trajectory in three-dimensional phase space. A crossing in its 2D drawing can join points with different hidden coordinates. Switch the small diagram's projection to see how the same path changes.

A **Poincaré section** is a different operation: record the points where the trajectory crosses a chosen plane in one direction. Joining every projected position gives a shadow of the path; recording those crossings gives a section of the dynamics. The lesson above compares projections, and does not compute a Poincaré section.

[ChaosBook explains the section and return map](https://chaosbook.org/chapters/maps.pdf).

Compare the [Rössler attractor's spiral and side view](/rossler-attractor), or the geometric shadow and slice comparison in the [Menger sponge](/menger-sponge).
