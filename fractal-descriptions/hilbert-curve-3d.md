# 3D Hilbert Curve

Can one path visit every little cube in a box without jumping?

Split the box into eight cubes. Put a smaller path inside each. Turn the paths so the end of one meets the start of the next. Repeat inside every smaller cube.<sup><a id="hilbert-curve-3d-ref-1" href="#hilbert-curve-3d-source-1">1</a></sup>

<figure data-construction-player="hilbert-curve-3d"></figure>

The first grid has 8 stops. The next has 64, then 512. Each stop connects to a neighbor one grid step away.

Rotate the drawing. Lines that seem to cross in a flat view can sit at different depths.

Every finite path leaves space around its lines. After infinitely many rounds, the path reaches every point in the box. A line can fill a volume when you take that limit.

There are many ways to join the eight smaller routes. Haverkort counted more than ten million versions under one set of requirements. This page uses John Skilling's method to choose its particular route.<sup><a id="hilbert-curve-3d-ref-2" href="#hilbert-curve-3d-source-2">2</a></sup>

The [2D Hilbert curve](/l-system/hilbert-curve) makes the same connection problem easier to follow, with four squares instead of eight cubes.

## Sources and notes

1. <span id="hilbert-curve-3d-source-1"></span> Herman Haverkort, [How many three-dimensional Hilbert curves are there?](https://pure.tue.nl/ws/portalfiles/portal/87535424/298_1389_1_PB.pdf), Journal of Computational Geometry 8(1), 206–281, 2017. Introduction and sections 2–3 establish the cube-subdivision framework and the classification’s scope. Counts above come from the local grid size. [Back](#hilbert-curve-3d-ref-1)
2. <span id="hilbert-curve-3d-source-2"></span> John Skilling, [Programming the Hilbert curve](https://doi.org/10.1063/1.1751381), AIP Conference Proceedings 707, 381–387, 2004. This is the method identified in the garden’s generateHilbertCurve3D implementation. [Back](#hilbert-curve-3d-ref-2)
