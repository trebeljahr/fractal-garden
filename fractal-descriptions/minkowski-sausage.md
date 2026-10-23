# Minkowski Sausage

Take a straight line. Add one square bump on one side and another on the other side. Repeat the pattern on every new line.

Eight little lines replace one. Each is one quarter as long, so the total route doubles in length.<sup><a id="minkowski-sausage-ref-1" href="#minkowski-sausage-source-1">1</a></sup>

<figure data-construction-player="minkowski-sausage"></figure>

The drawing rule is:

```text
F → F+F-F-FF+F+F-F
```

F draws forward. Plus and minus turn by 90 degrees. The route finishes four little step lengths ahead, facing the way it started.

Start with a square to make the island version. One bump adds area outside an edge. The other removes the same amount inside it. The outline gets longer while those two changes cancel.

## A longer wire in a smaller span

Researchers use versions of this route in antenna designs. The bends fit more wire between two endpoints. A 2008 study simulated an antenna based on the first replacement stage.<sup><a id="minkowski-sausage-ref-2" href="#minkowski-sausage-source-2">2</a></sup>

The [quadratic snowflake](/l-system/quadratic-snowflake) uses one square bump per replacement. It has no matching bump on the opposite side.

## Sources and notes

1. <span id="minkowski-sausage-source-1"></span> Fawwaz J. Jibrael, Faez F. Shareef and Wafaa S. Mummo, [Small Size and Dual Band of a Quadratic Koch Dipole Fractal Antenna Design](https://thescipub.com/pdf/ajassp.2008.1804.1807.pdf), American Journal of Applied Sciences 5(12), 1804–1807, 2008. Figure 1 and the accompanying text specify eight quarter-scale pieces and similarity dimension 1.5. The signed-area cancellation follows from the local rule. [Back](#minkowski-sausage-ref-1)
2. <span id="minkowski-sausage-source-2"></span> Jibrael, Shareef and Mummo, [same paper](https://thescipub.com/pdf/ajassp.2008.1804.1807.pdf), 2008, antenna design and results. Reports numerical simulations in 4NEC2 for a first-stage quadratic Koch dipole. [Back](#minkowski-sausage-ref-2)
