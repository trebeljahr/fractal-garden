# 3D Hilbert Curve

Divide a cube into eight smaller cubes. Put a path inside each one, then turn the paths so that each endpoint connects to the next path's start. Repeat inside the smaller cubes.<sup><a id="hilbert-curve-3d-ref-1" href="#hilbert-curve-3d-source-1">1</a></sup>

<figure data-construction-player="hilbert-curve-3d"></figure>

The first grid has two positions in each direction, making eight positions altogether. The next has four in each direction, making sixty-four. The route visits each position once, moving one grid step between neighbors.

A flat view can hide the separation between lines. Two segments that appear to cross may be at different depths. Rotating the cube makes that separation visible.

Each finite path consists of line segments with space between them. In the infinite limit, the route reaches every point of the cube. The [2D Hilbert curve](/l-system/hilbert-curve) reaches every point of a square by the same nested subdivision.

There is more than one way to arrange the eight smaller routes. This page uses John Skilling's method to choose their orientations and order.<sup><a id="hilbert-curve-3d-ref-2" href="#hilbert-curve-3d-source-2">2</a></sup>

## Sources and notes

1. <span id="hilbert-curve-3d-source-1"></span> Herman Haverkort, [How many three-dimensional Hilbert curves are there?](https://pure.tue.nl/ws/portalfiles/portal/87535424/298_1389_1_PB.pdf), Journal of Computational Geometry 8(1), 206–281, 2017. Introduction and sections 2–3 establish the cube-subdivision framework and the classification’s scope. Counts above come from the local grid size. [Back](#hilbert-curve-3d-ref-1)
2. <span id="hilbert-curve-3d-source-2"></span> John Skilling, [Programming the Hilbert curve](https://doi.org/10.1063/1.1751381), AIP Conference Proceedings 707, 381–387, 2004. This is the method identified in the garden’s generateHilbertCurve3D implementation. [Back](#hilbert-curve-3d-ref-2)
