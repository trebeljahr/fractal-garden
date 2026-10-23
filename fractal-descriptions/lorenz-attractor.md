# Lorenz Attractor

The Lorenz system calculates how three values change over time. Each value affects the others. Plotting the three values as coordinates produces the two-winged trail shown here.

These coordinates came from a simplified model of heat-driven fluid motion. One describes circulation; the other two describe temperature differences. The trail is a plot of those changing quantities, not the route of a particle through the fluid.<sup><a id="lorenz-attractor-ref-1" href="#lorenz-attractor-source-1">1</a></sup>

<figure data-lesson="lorenz"></figure>

The comparison starts a second calculation just 0.001 away in one coordinate. Both calculations use exactly the same rules. They initially produce similar values, but later can circle different wings.

This is sensitivity to the starting conditions. If the starting values are only approximately known, their later values can become difficult to predict. The separation doesn't increase at every moment: the two points can move closer together before separating again.

## Sources and notes

1. <span id="lorenz-attractor-source-1"></span> Edward N. Lorenz, [Deterministic Nonperiodic Flow](https://www.lmd.polytechnique.fr/~dubos/Cours/PRL/Lorenz63.pdf), *Journal of the Atmospheric Sciences* 20 (1963), 130–141, especially section 5. Derives the three-variable convection model and identifies its variables. [Back](#lorenz-attractor-ref-1)
