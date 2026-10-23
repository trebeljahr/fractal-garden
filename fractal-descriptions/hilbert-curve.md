# Hilbert Curve

Draw a U. Make four smaller copies and turn them so you can join their ends. Now you have a longer path inside the same square.

Repeat. Each round visits smaller squares. In the infinite limit, the path reaches every point in the big square.<sup><a id="hilbert-curve-ref-1" href="#hilbert-curve-source-1">1</a></sup>

<figure data-construction-player="lsystem-hilbert"></figure>

The first path visits four grid points. The next visits sixteen, then sixty-four. It visits each grid point once and connects neighboring points with straight lines.

Every finite drawing leaves gaps. Keep dividing the squares, and those gaps get smaller. There is no point the limiting path cannot reach.

## How the computer draws it

Start with W and replace the letters:

```text
V → -WF+VFV+FW-
W → +VF-WFW-FV+
```

F draws forward. Plus and minus make right-angle turns. V and W add instructions for the next round. They choose how the smaller U-shaped paths face.

The [3D version](/l-system/hilbert-curve-3d) joins eight paths inside a cube. The [Dragon curve](/l-system/dragon-curve) fills a different shape using a rule you can also make by folding paper.

## Sources and notes

1. <span id="hilbert-curve-source-1"></span> Herman Haverkort, [How many three-dimensional Hilbert curves are there?](https://pure.tue.nl/ws/portalfiles/portal/87535424/298_1389_1_PB.pdf), Journal of Computational Geometry 8(1), 206–281, 2017. Introduction and section 2 describe nested subdivisions and continuous, surjective mappings. The letter rules and grid counts describe this explorer. [Back](#hilbert-curve-ref-1)
