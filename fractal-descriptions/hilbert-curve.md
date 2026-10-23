# Hilbert Curve

The first Hilbert path is a U connecting four points in a square. To make the next stage, divide the square into four smaller squares and put a smaller copy of the path in each.

Rotate the copies so that three short connecting lines join them into one route. Repeat this arrangement inside every smaller square.<sup><a id="hilbert-curve-ref-1" href="#hilbert-curve-source-1">1</a></sup>

<figure data-construction-player="lsystem-hilbert"></figure>

The route visits every point in a square grid once. The first grid has $2\times2$ points. The next has $4\times4$, then $8\times8$. Adjacent points along the route are always one grid step apart.

Choose a spot anywhere in the square. As the grid gets finer, the path passes closer and closer to it. In the infinite limit, it reaches every spot. This is what **space-filling** means. Every drawing you can actually make still has gaps between its lines.

The [3D version](/l-system/hilbert-curve-3d) uses eight smaller cubes instead of four squares. Their routes need to connect across shared faces as well as turn within a plane.

## Sources and notes

1. <span id="hilbert-curve-source-1"></span> Herman Haverkort, [How many three-dimensional Hilbert curves are there?](https://pure.tue.nl/ws/portalfiles/portal/87535424/298_1389_1_PB.pdf), Journal of Computational Geometry 8(1), 206–281, 2017. Introduction and section 2 describe nested subdivisions and continuous, surjective mappings. [Back](#hilbert-curve-ref-1)
