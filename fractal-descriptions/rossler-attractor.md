# Rössler Attractor

The Rössler system calculates three changing coordinates. Its trail makes an outward spiral, rises out of the spiral's plane, then returns toward the center.

The top view shows the spiral. The side view shows the changes in height that are harder to see from above. Both views use the same calculation.<sup><a id="rossler-attractor-ref-2" href="#rossler-attractor-source-2">2</a></sup>

<figure data-lesson="rossler"></figure>

The point circles outward while it stays low. Then it rises, turns inward and returns to the spiral. The side view shows this rise and return more clearly.<sup><a id="rossler-attractor-ref-1" href="#rossler-attractor-source-1">1</a></sup>

Two lines can cross in the top view while passing above and below one another. Switch to the side view to check their heights.

## Sources and notes

1. <span id="rossler-attractor-source-1"></span> Otto E. Rössler, [An Equation for Continuous Chaos](https://www.chaotic-circuits.com/wp-content/uploads/2015/01/AN-EQUATION-FOR-CONTINUOUS-CHAOS_ROSSLER.pdf), *Physics Letters A* 57(5), 12 July 1976, 397–398. Gives the spiral/fold construction. [Back](#rossler-attractor-ref-1)
2. <span id="rossler-attractor-source-2"></span> Diagram construction. Both views plot the same numerical solution of dx/dt = −y − z, dy/dt = x + ay, dz/dt = b + z(x − c), with a = 0.2, b = 0.2 and c = 5.7. These match the equations and example parameters in Rössler’s paper. [Back](#rossler-attractor-ref-2)
