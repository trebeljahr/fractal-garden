# Quadratic Snowflake

Take a straight line and put a square bump in its middle. Five little lines now connect the same two ends.

Repeat on every line. Each bump grows smaller bumps of its own.<sup><a id="quadratic-snowflake-ref-1" href="#quadratic-snowflake-source-1">1</a></sup>

<figure data-construction-player="quadratic-snowflake"></figure>

This version starts with a square whose sides each contain two drawing steps. The first round puts two bumps along each side, pointing into the square.

Each new step is one third as long. Five steps replace one, so the total route grows by $5/3$ each round.

The rule is:

```text
F → F+F-F-F+F
```

F draws forward. Plus and minus turn by 90 degrees. The middle three F steps walk around three sides of the little square.

The [Minkowski sausage](/l-system/minkowski-sausage) adds a matching bump on the opposite side of each edge. This rule has only one bump.

The [quadratic Koch surface](/quadratic-koch-3d) moves the idea into space, putting little cube-shaped bumps on square faces.

## Sources and notes

1. <span id="quadratic-snowflake-source-1"></span> Przemysław Prusinkiewicz and Aristid Lindenmayer, [The Algorithmic Beauty of Plants, chapter 1](https://algorithmicbotany.org/papers/abop/abop-ch1.lowquality.pdf), Springer-Verlag, 1990. Sections 1.1–1.3 explain edge replacement and turtle interpretation. The five-step rule, starting square and inward bumps describe this explorer’s preset. The linked 3D page implements its own face-replacement construction. [Back](#quadratic-snowflake-ref-1)
