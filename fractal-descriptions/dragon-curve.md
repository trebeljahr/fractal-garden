# Dragon Curve

Fold a paper strip in half repeatedly, always in the same direction. Unfold it until each crease makes a right angle. The resulting path is a dragon curve.<sup><a id="dragon-curve-ref-1" href="#dragon-curve-source-1">1</a></sup>

Each additional fold doubles the number of sections in the strip. The new crease directions determine whether each connection turns left or right.

Open the strip below. Choose a crease to follow the two sections it joins.

<figure data-lesson="dragon-fold"></figure>

<figure data-construction-player="lsystem-dragon"></figure>

The computer makes this path with two drawing instructions, F and G. Both mean draw forward, but they have different replacement rules:

```text
F → F+G
G → F-G
```

Plus turns left by 90 degrees. Minus turns right. Start with F and replace all letters at once before drawing the next stage.

Every letter becomes two drawing letters, so the segment count doubles. If the distance between the path's endpoints stays fixed, each new segment is about 71% of the previous length.

At finite stages, there are gaps between the segments. The infinite path includes a region with area, not only a boundary around it.<sup><a id="dragon-curve-ref-2" href="#dragon-curve-source-2">2</a></sup> The [Twindragon](/l-system/twindragon) joins two copies of the path at their ends.

For the tiling diagram, each segment is the diagonal of a small filled square. Together these squares fill a region around the finite path. Higher detail makes the squares smaller.

Four copies meet at their starting point, rotated by 0, 90, 180 and 270 degrees.<sup><a id="dragon-curve-ref-3" href="#dragon-curve-source-3">3</a></sup> Repeating this group in diagonal rows covers the plane without gaps between tiles.<sup><a id="dragon-curve-ref-4" href="#dragon-curve-source-4">4</a></sup>

<figure data-lesson="dragon-tiling"></figure>

## Further reading

- [Dragon curve — Wikipedia](https://en.wikipedia.org/wiki/Dragon_curve)
- [Dragon curve — MathWorld](https://mathworld.wolfram.com/DragonCurve.html)

## Sources and notes

1. <span id="dragon-curve-source-1"></span> [Paperfolding morphisms, planefilling curves, and fractal tiles](https://arxiv.org/pdf/1011.5788). [Back](#dragon-curve-ref-1)
2. <span id="dragon-curve-source-2"></span> Sze-Man Ngai and Nhu Nguyen, [The Heighway Dragon Revisited](https://link.springer.com/article/10.1007/s00454-003-0778-7), Discrete & Computational Geometry 29 (2003), 603–623. Proves a decomposition into disk-like pieces with open interiors. Nonempty interior implies positive area and Hausdorff dimension 2. The [author repository](https://digitalcommons.georgiasouthern.edu/math-sci-facpubs/602/) provides the abstract freely. [Back](#dragon-curve-ref-2)
3. <span id="dragon-curve-source-3"></span> Michel Dekking, [Paperfolding morphisms, planefilling curves, and fractal tiles](https://arxiv.org/pdf/1011.5788), Theoretical Computer Science 414, no. 1 (2012), 20–37, sections 8–10. Discusses four quarter-turned folding curves and their limiting tiles. [Back](#dragon-curve-ref-3)
4. <span id="dragon-curve-source-4"></span> Diagram construction. With the path’s endpoints one unit apart, the four-copy groups repeat at shifts of (1, 1) and (1, −1). Each path segment is the diagonal of a filled square. [Back](#dragon-curve-ref-4)
