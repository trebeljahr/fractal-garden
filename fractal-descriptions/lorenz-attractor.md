# Lorenz Attractor

The Lorenz Attractor is the shape that made chaos famous. In 1963 the meteorologist Edward Lorenz boiled a model of convection in the atmosphere down to three coupled equations:

$$
\frac{dx}{dt} = \sigma (y - x), \qquad
\frac{dy}{dt} = x (\rho - z) - y, \qquad
\frac{dz}{dt} = x y - \beta z
$$

With his original values $\sigma = 10$, $\rho = 28$ and $\beta = 8/3$, a point that follows these equations never settles down and never repeats itself. Instead it loops around one wing of the butterfly, jumps unpredictably to the other wing, loops there for a while, and jumps back. Two starting points that are almost identical end up on completely different parts of the attractor after a short while. That sensitive dependence on initial conditions is the original "butterfly effect".

Even though the motion is chaotic, the orbit always stays on the same thin, folded surface. The surface is not really two-dimensional, though: zoom into one of the wings and it splits into infinitely many sheets packed closer and closer together. Its Hausdorff dimension is about $2.06 \pm 0.01$, a little more than a surface, a lot less than a solid.

What you see here is a numerical solution with the classic fourth-order [Runge-Kutta method](https://en.wikipedia.org/wiki/Runge%E2%80%93Kutta_methods). Every step moves the point a small time step `dt` forward along the flow, and all the steps together form the trail. Smaller time steps give a more accurate path, more steps give a longer one. Try lowering $\rho$ to about $20$: the centers of the two wings turn into stable fixed points and the trail spirals into one of them instead of flying around forever.

The same route from order to chaos shows up in a single, much simpler equation in the [Logistic Map](/logistic-map). If you like the look of a curve winding through space, compare it with its smaller cousin, the [Rössler Attractor](/rossler-attractor), or with the very orderly [3D Hilbert Curve](/l-system/hilbert-curve-3d).
