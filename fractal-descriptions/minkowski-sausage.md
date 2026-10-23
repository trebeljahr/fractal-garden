# Minkowski Sausage

One square bump rises from an edge and another falls below it. Replace every stroke with this eight-stroke route:

```
F → F+F-F-FF+F+F-F
```

All turns are 90 degrees. The route finishes four unit steps along the original edge, facing the original direction. Divide its stroke length by four to keep the old endpoints fixed.<sup><a id="minkowski-sausage-ref-1" href="#minkowski-sausage-source-1">1</a></sup>

<figure data-construction-player="minkowski-sausage"></figure>

After $n$ rewrites, an open curve contains $8^n$ strokes, each of relative length $4^{-n}$. The total length doubles per rewrite. Its similarity dimension is $\log8/\log4=3/2$.

The island option starts with four sides of a square. The two bumps have equal and opposite signed areas, so each replacement preserves the closed path's signed area. It adds boundary length without a net area increment. The [Quadratic snowflake](/l-system/quadratic-snowflake) uses a single bump instead.

Finite versions of this route also appear in antenna research. Jibrael, Shareef and Mummo simulated a dipole based on the first replacement stage in 2008. Their reported resonances belong to that particular conductor and electromagnetic model. The curve supplies a repeatable way to fit a longer wire into a smaller span.<sup><a id="minkowski-sausage-ref-2" href="#minkowski-sausage-source-2">2</a></sup>

## Sources and notes

1. <span id="minkowski-sausage-source-1"></span> Fawwaz J. Jibrael, Faez F. Shareef and Wafaa S. Mummo, [Small Size and Dual Band of a Quadratic Koch Dipole Fractal Antenna Design](https://thescipub.com/pdf/ajassp.2008.1804.1807.pdf), American Journal of Applied Sciences 5(12), 1804–1807, 2008. Figure 1 and the accompanying text specify eight quarter-scale pieces and similarity dimension 1.5. The signed-area cancellation follows from the local rule. [Back](#minkowski-sausage-ref-1)
2. <span id="minkowski-sausage-source-2"></span> Jibrael, Shareef and Mummo, [same paper](https://thescipub.com/pdf/ajassp.2008.1804.1807.pdf), 2008, antenna design and results. Reports numerical simulations in 4NEC2 for a first-stage quadratic Koch dipole. [Back](#minkowski-sausage-ref-2)
