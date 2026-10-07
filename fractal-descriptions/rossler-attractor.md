# Rössler Attractor

The Rössler Attractor is what you get when you try to build the simplest possible chaotic system. In 1976 Otto Rössler looked at the [Lorenz Attractor](/lorenz-attractor) and asked whether chaos really needs two wings and two nonlinear terms. His answer was a system with only one nonlinear term:

$$
\frac{dx}{dt} = -y - z, \qquad
\frac{dy}{dt} = x + a y, \qquad
\frac{dz}{dt} = b + z (x - c)
$$

With the standard values $a = 0.2$, $b = 0.2$ and $c = 5.7$, the orbit spirals outward in the $xy$-plane. Once it gets far enough from the center, the $z$ term switches on, lifts the orbit up into a sharp fold and drops it back near the middle of the spiral. Then the whole process starts over. That stretch-and-fold motion, a bit like kneading dough, is the basic recipe behind most chaotic systems.

The attractor is almost a flat band with one twist in it, so its fractal dimension is only just above two: estimates based on its Lyapunov exponents give about $2.01$. Cut through it and you would find a Cantor-like stack of very thin layers.

What you see here is a numerical solution with the classic fourth-order [Runge-Kutta method](https://en.wikipedia.org/wiki/Runge%E2%80%93Kutta_methods). The parameter $c$ is the most fun to play with. For small values, around $c = 2.3$, the orbit closes into a simple loop. Increase it and the loop doubles to period 2, then 4, then 8, until it turns chaotic, the same period-doubling cascade you can see in the [Logistic Map](/logistic-map).
