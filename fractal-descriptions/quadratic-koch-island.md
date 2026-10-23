# Quadratic Koch Island

This island uses an eighteen-stroke replacement on each side of a square. Start with `F-F-F-F`, turn by 90 degrees, and rewrite:

```
F → F+FF-FF-F-F+F+FF-F-F+F+FF+FF-F
```

The name “quadratic Koch” covers several square-grid constructions. This page uses the eighteen-piece version. The [Minkowski sausage](/l-system/minkowski-sausage) uses eight pieces, while the [Quadratic snowflake](/l-system/quadratic-snowflake) uses five.<sup><a id="quadratic-koch-island-ref-1" href="#quadratic-koch-island-source-1">1</a></sup>

<figure data-construction-player="quadratic-koch-island"></figure>

Read the eighteen strokes by direction. Eight advance along the old edge and two move backward. Four turn to each side. The sideways displacements cancel, leaving a six-unit chord. Every child stroke therefore has one sixth of the parent's length when the endpoints stay fixed.

The boundary walk's length triples per rewrite: eighteen strokes replace six units of straight progress. Its similarity exponent is $\log18/\log6\approx1.613$. That exponent records the prescribed copy scales.

The generator also balances its signed area above and below the chord. Those two detours cancel, so replacing all sides preserves the closed walk's signed area.

## Sources and notes

1. <span id="quadratic-koch-island-source-1"></span> Przemysław Prusinkiewicz and Aristid Lindenmayer, [The Algorithmic Beauty of Plants, chapter 1](https://algorithmicbotany.org/papers/abop/abop-ch1.lowquality.pdf), Springer-Verlag, 1990. Sections 1.1–1.3 explain Koch-style edge replacement and turtle words. The exact eighteen-piece variant, directional counts, chord, similarity exponent and signed-area cancellation above are direct derivations from this garden’s displayed rule. [Back](#quadratic-koch-island-ref-1)
