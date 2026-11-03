# Minkowski Sausage

Replace a straight line with eight smaller lines arranged in right-angle steps. One square-shaped detour lies on each side of the old line.

The replacement finishes four step lengths ahead, facing the original direction. Giving each new step one quarter of the old length keeps both endpoints in place.<sup><a id="minkowski-sausage-ref-1" href="#minkowski-sausage-source-1">1</a></sup>

<figure data-construction-player="minkowski-sausage"></figure>

Eight quarter-length lines have twice the length of one original line. The total distance drawn therefore doubles at every step.

The island option applies this rule around a square. One detour extends outside an old edge. The other extends inside it. Their equal areas cancel when calculating the signed area of the closed route: outward area is added and inward area is subtracted.

This makes the boundary longer without changing that signed area. The [quadratic snowflake](/l-system/quadratic-snowflake) uses one square-shaped detour per replacement, without the matching detour on the other side.

The rule is `F → F+F-F-FF+F+F-F`, with 90-degree turns. Every F draws one forward step.

## Further exploring

### Videos

- [Fractals and Scaling: Quadratic Koch Curve — Complexity Explorer](https://www.youtube.com/watch?v=i1_MXWbCKZY)

### Reading

- [Minkowski sausage — Wikipedia](https://en.wikipedia.org/wiki/Minkowski_sausage)
- [Minkowski sausage (different motif) — MathWorld](https://mathworld.wolfram.com/MinkowskiSausage.html)
- [Square Koch Fractal Curves — Wolfram Demonstrations](https://demonstrations.wolfram.com/SquareKochFractalCurves/)

## Sources and notes

1. <span id="minkowski-sausage-source-1"></span> Fawwaz J. Jibrael, Faez F. Shareef and Wafaa S. Mummo, [Small Size and Dual Band of a Quadratic Koch Dipole Fractal Antenna Design](https://thescipub.com/ajas/ajassp.2008.1804.1807.pdf), American Journal of Applied Sciences 5(12), 1804–1807, 2008. Figure 1 and the accompanying text specify eight quarter-scale pieces and similarity dimension 1.5. [Back](#minkowski-sausage-ref-1)
