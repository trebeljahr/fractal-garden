# Quadratic Koch Island

Start with a square. Replace each side with a winding path of eighteen little lines. Add that same winding path to every new line.

The turns are all right angles. Bumps grow on both sides of each old edge.

<figure data-construction-player="quadratic-koch-island"></figure>

One replacement takes eighteen steps but finishes only six step lengths ahead. Make each new step one sixth as long to keep the old corners in place.

Eighteen times one sixth is three. The total distance around the route triples each round.

The detours on opposite sides of an edge balance their signed areas. “Signed” means an inward patch subtracts what an outward patch adds. This balance preserves the closed route's signed area even as the route gets longer.

## The eighteen-step rule

Start with `F-F-F-F` and replace F with:

```text
F → F+FF-FF-F-F+F+FF-F-F+F+FF+FF-F
```

F draws forward. Plus and minus turn by 90 degrees. This is one of several patterns called quadratic Koch islands.<sup><a id="quadratic-koch-island-ref-1" href="#quadratic-koch-island-source-1">1</a></sup>

The [Minkowski sausage](/l-system/minkowski-sausage) uses eight lines per replacement. The [quadratic snowflake](/l-system/quadratic-snowflake) uses five.

## Sources and notes

1. <span id="quadratic-koch-island-source-1"></span> Przemysław Prusinkiewicz and Aristid Lindenmayer, [The Algorithmic Beauty of Plants, chapter 1](https://algorithmicbotany.org/papers/abop/abop-ch1.lowquality.pdf), Springer-Verlag, 1990. Sections 1.1–1.3 explain Koch-style edge replacement and turtle words. The eighteen-step rule, six-step span and signed-area balance are direct calculations from this explorer’s rule. [Back](#quadratic-koch-island-ref-1)
