# Hilbert Curve

Place a dot at each corner of a square. Join them with three lines to make a U. You can follow it through all four dots without lifting your pen.

To visit more dots, divide the square into four smaller squares. Put a smaller U in each one. Their ends need to face one another so you can join them into a single path.

<figure data-lesson="hilbert-join"></figure>

Once the four paths join, you have a route through sixteen dots. Repeat the arrangement with four copies of this new route. Each round visits four times as many dots, still without lifting the pen or visiting a dot twice.<sup><a id="hilbert-curve-ref-1" href="#hilbert-curve-source-1">1</a></sup>

<figure data-construction-player="lsystem-hilbert"></figure>

Pick a spot in one of the gaps. As the grid gets finer, the path passes closer to it. In the infinite limit, the path reaches every spot in the square. That is what **space-filling** means. Every finite drawing still leaves gaps between its lines.

The [3D version](/l-system/hilbert-curve-3d) does the same inside a cube. It joins eight smaller paths, one in each of eight smaller cubes.

## Further reading

- [Hilbert curve — Wikipedia](https://en.wikipedia.org/wiki/Hilbert_curve)
- [Hilbert’s Curve — 3Blue1Brown](https://www.3blue1brown.com/lessons/hilbert-curve/)

## Sources and notes

1. <span id="hilbert-curve-source-1"></span> [How many three-dimensional Hilbert curves are there?](https://pure.tue.nl/ws/portalfiles/portal/87535424/298_1389_1_PB.pdf). [Back](#hilbert-curve-ref-1)
