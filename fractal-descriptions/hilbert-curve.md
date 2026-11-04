# Hilbert Curve

Place a dot at each corner of a square and join them with three lines to make a U, which you can follow through all four dots without lifting your pen. To visit more dots, divide the square into four smaller squares and put a smaller U in each. That leaves four separate paths, so their ends have to face one another before you can join them into one.

Below, try rotating route 1 until its filled end sits beside route 2's hollow start. A join should be as short as the other lines, and the dashed joins are too long.

<figure data-lesson="hilbert-join"></figure>

Once the four paths join, you have a route through sixteen dots, so you can repeat the arrangement with four copies of this new route. Choose the 8 × 8 grid to see this: each colored route now contains four smaller routes, joined in the same way. If you reverse one, its start and end swap places, and the joins beside it stop fitting.

Each round visits four times as many dots, still without lifting the pen or visiting a dot twice.<sup><a id="hilbert-curve-ref-1" href="#hilbert-curve-source-1">1</a></sup>

<figure data-construction-player="lsystem-hilbert"></figure>

Pick a spot in one of the gaps, and as the grid gets finer, the path passes closer to it. In the infinite limit, the path reaches every spot in the square, which is what **space-filling** means. Every finite drawing still leaves gaps between its lines.

The [3D version](/l-system/hilbert-curve-3d) does the same inside a cube, joining eight smaller paths, one in each of eight smaller cubes.

## Further exploring

### Videos

- [Space-Filling Curves — Numberphile](https://www.youtube.com/watch?v=x-DgL49CFlM)
- [Hilbert’s Curve — 3Blue1Brown](https://www.youtube.com/watch?v=3s7h2MHQtxc)
- [Coding the Hilbert Curve — The Coding Train](https://www.youtube.com/watch?v=dSK-MW-zuAc)

### Reading

- [Hilbert curve — Wikipedia](https://en.wikipedia.org/wiki/Hilbert_curve)
- [Hilbert curve — MathWorld](https://mathworld.wolfram.com/HilbertCurve.html)

## Sources and notes

1. <span id="hilbert-curve-source-1"></span> [How many three-dimensional Hilbert curves are there?](https://pure.tue.nl/ws/portalfiles/portal/87535424/298_1389_1_PB.pdf). [Back](#hilbert-curve-ref-1)
