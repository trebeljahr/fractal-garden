# Minkowski Sausage

Replace a straight line with eight smaller lines arranged in right-angle steps. One square-shaped detour lies on each side of the old line.

The replacement finishes four step lengths ahead, facing the original direction. Giving each new step one quarter of the old length keeps both endpoints in place.<sup><a id="minkowski-sausage-ref-1" href="#minkowski-sausage-source-1">1</a></sup>

<figure data-construction-player="minkowski-sausage"></figure>

Eight quarter-length lines have twice the length of one original line. So **Line length** doubles at every level.

Now choose **Around a square**. The same replacement runs along all four sides, and the line closes into an island. Raise the level. By level 5 the line is 32 times as long as the square's outline, but **Area** still reads exactly 100% of the square. Repeat forever and the line grows without bound, while the area never changes.<sup><a id="minkowski-sausage-ref-2" href="#minkowski-sausage-source-2">2</a></sup>

The tints show what a level changes. Every replacement takes one small square out of the island (orange) and adds one to it (blue). So **Removed** and **Added** always match.

Why do they match? Press **Half turn** to rotate one replacement around its middle point.

<figure data-lesson="half-turn-minkowski"></figure>

It lands exactly on itself, and the two tints trade places. So the detour on one side of the old line has the same shape and size as the detour on the other, and one adds what the other removes.

The [quadratic snowflake](/l-system/quadratic-snowflake) has a notch on one side of each old line and nothing on the other. A half turn doesn't land on itself, and its area shrinks.

## Further exploring

### Videos

- [Fractals and Scaling: Quadratic Koch Curve — Complexity Explorer](https://www.youtube.com/watch?v=i1_MXWbCKZY)

### Reading

- [Minkowski sausage — Wikipedia](https://en.wikipedia.org/wiki/Minkowski_sausage)
- [Minkowski sausage (different motif) — MathWorld](https://mathworld.wolfram.com/MinkowskiSausage.html)
- [Square Koch Fractal Curves — Wolfram Demonstrations](https://demonstrations.wolfram.com/SquareKochFractalCurves/)

## Sources and notes

1. <span id="minkowski-sausage-source-1"></span> Fawwaz J. Jibrael, Faez F. Shareef and Wafaa S. Mummo, [Small Size and Dual Band of a Quadratic Koch Dipole Fractal Antenna Design](https://thescipub.com/ajas/ajassp.2008.1804.1807.pdf), American Journal of Applied Sciences 5(12), 1804–1807, 2008. Figure 1 and the accompanying text specify eight quarter-scale pieces and similarity dimension 1.5. [Back](#minkowski-sausage-ref-1)
2. <span id="minkowski-sausage-source-2"></span> Calculation. Level $n$ has $4\cdot8^n$ lines, each $4^{-n}$ of a side. In exact grid coordinates for levels 1 to 5, the line closes, never reaches a corner twice and encloses $16^n$ small squares, which is the starting square's area. [Back](#minkowski-sausage-ref-2)
