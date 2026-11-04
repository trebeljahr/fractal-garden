# 3D Hilbert Curve

Divide a cube into eight smaller cubes and put a small copy of the whole path inside each one, turning or mirroring the copies so that each path's end meets the next path's start. Then repeat inside the smaller cubes, so level 1 visits 8 positions and level 2 visits 64. Each position gets one visit, each move is one grid step, and in the infinite limit the path reaches every point of the cube.

<figure data-construction-player="hilbert-curve-3d"></figure>

The path never crosses itself. Lines that seem to cross are at different depths, and dragging the cube shows them apart.

The [2D Hilbert curve](/l-system/hilbert-curve) does the same with four paths in a square, and only one curve can be built that way. In a cube, Herman Haverkort counted 10,694,807.<sup><a id="hilbert-curve-3d-ref-1" href="#hilbert-curve-3d-source-1">1</a></sup> Both counts treat a turned, mirrored or reversed copy of a whole curve as the same curve.

Where does a cube get all that freedom? Take one small path at level 2. Its two ends have to meet its neighbors, so they can't move, and they sit at the two ends of one edge of its small cube. Mirror the path in the diagonal plane through that edge and the opposite edge. Both ends lie on the plane, so they stay put, while the rest of the path changes and stays inside the same cube.<sup><a id="hilbert-curve-3d-ref-2" href="#hilbert-curve-3d-source-1">1</a></sup>

<figure data-lesson="hilbert-mirror"></figure>

Press a number to mirror that small path, and press it again to undo. The shaded plane is the mirror, and the two dots are the path's ends. Each press changes only the inside of one small cube, so with any mix of numbers the joins still fit and the whole path still visits all 64 positions.

A square has no such mirror. A small U has its two ends on one side of its square, and the only line through both ends is that side, so mirroring the U over it puts the U outside the square. Haverkort checks every other place the ends could go and finds that none of them works, which leaves a square no choice.<sup><a id="hilbert-curve-3d-ref-3" href="#hilbert-curve-3d-source-1">1</a></sup>

Each small cube has a second yes-or-no choice: its copy can run forward or backward between the same two ends. Two yes-or-no choices in each of eight cubes make 65,536 settings. Haverkort finds 178 ways to order the eight cubes and place the ends of their paths. Multiply, remove the settings that repeat a curve, and you have almost all of the 10,694,807.<sup><a id="hilbert-curve-3d-ref-4" href="#hilbert-curve-3d-source-2">2</a></sup> Only 223,281 of those move one grid step at a time, as this page's curve does, and the others sometimes step diagonally.<sup><a id="hilbert-curve-3d-ref-5" href="#hilbert-curve-3d-source-1">1</a></sup>

## Further exploring

### Videos

- [Hilbert Curve — Henry Segerman](https://www.youtube.com/watch?v=jIiwJpGp_rc)
- [Space filling curves filling with water — Steve Mould](https://www.youtube.com/watch?v=DWzXF9B68nQ)

### Reading

- [Hilbert curves — Wikipedia](https://en.wikipedia.org/wiki/Hilbert_curve)
- [Hilbert curve — MathWorld](https://mathworld.wolfram.com/HilbertCurve.html)
- [3-D L-Systems — Robert Dickau](https://www.robertdickau.com/lsys3d.html)

## Sources and notes

1. <span id="hilbert-curve-3d-source-1"></span> [How many three-dimensional Hilbert curves are there?](https://pure.tue.nl/ws/portalfiles/portal/87535424/298_1389_1_PB.pdf) [Back](#hilbert-curve-3d-ref-1) [Back](#hilbert-curve-3d-ref-2) [Back](#hilbert-curve-3d-ref-3) [Back](#hilbert-curve-3d-ref-5)
2. <span id="hilbert-curve-3d-source-2"></span> Calculation. The 178 adds the paper's 29 and 149 arrangements for curves whose two ends are corners of the cube. Of those, 150 give 65,536 curves each and 28 give 30,736 each, which makes 10,691,008. Running all 65,536 settings with this page's ends gives 30,736 different curves. [Back](#hilbert-curve-3d-ref-4)
