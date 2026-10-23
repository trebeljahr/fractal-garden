# 3D Hilbert Curve

An order-$n$ path visits $8^n$ grid positions inside a cube, with $2^n$ positions along each axis. Connect consecutive positions and the result contains $8^n-1$ segments. Each consecutive pair differs by one grid step along one axis.

The recursive description divides the cube into eight octants. Smaller routes turn and reflect inside them so that each route's exit meets the next route's entrance. In the limit, the path reaches every point of the cube.<sup><a id="hilbert-curve-3d-ref-1" href="#hilbert-curve-3d-source-1">1</a></sup>

<figure data-construction-player="hilbert-curve-3d"></figure>

A flat projection hides depth. Two strokes can appear to cross while occupying different planes. Rotating the cube reveals this separation. At any finite order, the path consists of straight segments and occupies zero volume. Its limiting image is the cube, whose Hausdorff dimension is 3.

There is no single inevitable 3D Hilbert curve. Hilbert's original square construction leaves several choices open when extended to eight octants. Haverkort's classification distinguishes 10,694,807 curves under his stated requirements, after identifying rotations, reflections and reversals.

This page computes its particular ordering with Skilling's index-to-coordinate method: Gray decoding and successive bit operations supply the octant orientations.<sup><a id="hilbert-curve-3d-ref-2" href="#hilbert-curve-3d-source-2">2</a></sup> The [2D Hilbert curve](/l-system/hilbert-curve) offers a smaller example of the same connection problem.

## Sources and notes

1. <span id="hilbert-curve-3d-source-1"></span> Herman Haverkort, [How many three-dimensional Hilbert curves are there?](https://pure.tue.nl/ws/portalfiles/portal/87535424/298_1389_1_PB.pdf), Journal of Computational Geometry 8(1), 206–281, 2017. Introduction and sections 2–3 establish the cube-subdivision framework and the classification’s scope. Counts above come from the local grid size. [Back](#hilbert-curve-3d-ref-1)
2. <span id="hilbert-curve-3d-source-2"></span> John Skilling, [Programming the Hilbert curve](https://doi.org/10.1063/1.1751381), AIP Conference Proceedings 707, 381–387, 2004. This is the method identified in the garden’s generateHilbertCurve3D implementation. [Back](#hilbert-curve-3d-ref-2)
