# Dragon Curve

Fold a paper strip in half. Fold it in half again, in the same direction. Repeat a few times, keeping the earlier folds closed.

Now open the strip until each crease makes a right angle. Follow it from one end: some creases turn left, others turn right. This is the **dragon curve**.<sup><a id="dragon-curve-ref-1" href="#dragon-curve-source-1">1</a></sup>

Open the creases below slowly and follow the two amber sections as they separate. The letters list the turns as you follow the strip from the pale dot: L for left, R for right. Choose one to highlight its crease.

<figure data-lesson="dragon-fold"></figure>

Each fold doubles the number of sections in the strip. The drawing below shows how the path changes as you add more folds.

<figure data-construction-player="lsystem-dragon"></figure>

Press **Lévy** to swap the rule. Both rules replace every line with two lines at a right angle. The dragon's new corners turn left on one line and right on the next, so its two halves turn opposite ways at their middles. The [Lévy curve](/l-system/levy-curve)'s new corners always turn left, so its two halves match.

Keep the two ends in the same places as you add folds. The sections must get shorter. In the infinite limit, the path fills a region with area.<sup><a id="dragon-curve-ref-2" href="#dragon-curve-source-2">2</a></sup>

To see that region, draw a small square around each section, with the section joining two opposite corners. These squares make the filled dragon below. Choose **One dragon** and **Show the path** to see each section inside its square. Lower the detail to see the squares themselves. Raise it again and the sections and their squares get smaller, while the dragon's edge gets more detailed.

Choose **Fit four together**. Four copies fit around the same starting point, each turned a quarter turn from the last.<sup><a id="dragon-curve-ref-3" href="#dragon-curve-source-1">1</a></sup> Pull them apart to follow their edges, then bring them back together.

<figure data-lesson="dragon-tiling"></figure>

Choose **Tile the plane** and follow one color to find copies of the same dragon. The four-copy groups fit together in diagonal rows. Repeating them covers the plane without gaps.<sup><a id="dragon-curve-ref-4" href="#dragon-curve-source-3">3</a></sup> The [Twindragon](/l-system/twindragon) makes another tile by joining just two dragon paths at their ends.

## Further exploring

### Videos

- [Dragon Curve — Numberphile](https://www.youtube.com/watch?v=wCyC-K_PnRY)
- [Unfolding Fractals — The Coding Train](https://www.youtube.com/watch?v=MazpwQNdJYQ)

### Reading

- [Dragon curve — Wikipedia](https://en.wikipedia.org/wiki/Dragon_curve)
- [Dragon curve — MathWorld](https://mathworld.wolfram.com/DragonCurve.html)
- [Heighway Dragon — Larry Riddle](https://larryriddle.agnesscott.org/ifs/heighway/heighway.htm)

## Sources and notes

1. <span id="dragon-curve-source-1"></span> [Paperfolding morphisms, planefilling curves, and fractal tiles](https://arxiv.org/pdf/1011.5788). [Back](#dragon-curve-ref-1) [Back](#dragon-curve-ref-3)
2. <span id="dragon-curve-source-2"></span> [The Heighway Dragon Revisited](https://link.springer.com/article/10.1007/s00454-003-0778-7). [Back](#dragon-curve-ref-2)
3. <span id="dragon-curve-source-3"></span> Diagram construction. With the path’s endpoints one unit apart, the four-copy groups repeat at shifts of (1, 1) and (1, −1). Each path segment is the diagonal of a filled square. [Back](#dragon-curve-ref-4)
