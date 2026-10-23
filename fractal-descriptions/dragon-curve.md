# Dragon Curve

Fold a strip of paper in half. Fold it in half again, always the same way. Open the folds until each crease makes a right angle. You get a dragon curve.<sup><a id="dragon-curve-ref-1" href="#dragon-curve-source-1">1</a></sup>

More folds mean more turns. The path curls around itself and leaves smaller copies of the same pattern.

<figure data-construction-player="lsystem-dragon"></figure>

The computer follows two rules:

```text
F → F+G
G → F-G
```

Both F and G draw forward. Plus turns left by 90 degrees. Minus turns right. Start with F, replace all the letters, then draw the new instructions.

The line count doubles each round: 1, 2, 4, 8, 16. To keep the distance between the two ends fixed, each new line is about 71% as long.

At any finite stage, this is a path made of straight lines. After infinitely many stages, its points fill a region with area. The dragon includes that region's inside as well as its outline.<sup><a id="dragon-curve-ref-2" href="#dragon-curve-source-2">2</a></sup>

## Fit the dragons together

Turn four copies around one point. Repeat that group in diagonal rows. Their edges fit together like jigsaw pieces. Continue the pattern in every direction to tile the plane.<sup><a id="dragon-curve-ref-3" href="#dragon-curve-source-3">3</a></sup>

<figure data-lesson="dragon-tiling"></figure>

The [Lévy curve](/l-system/levy-curve) uses the same two-piece size but turns the pieces differently. Put two dragons back to back to make the [Twindragon](/l-system/twindragon).

## Sources and notes

1. <span id="dragon-curve-source-1"></span> Tobey Mathis and Kiko Kawamura, [Revolving sequences and Terdragon](https://arxiv.org/html/2106.10549), arXiv:2106.10549, 2021, section 1. Describes the Heighway dragon’s paper-folding origin. Letter rules, line counts and sizes follow this explorer’s construction. [Back](#dragon-curve-ref-1)
2. <span id="dragon-curve-source-2"></span> Sze-Man Ngai and Nhu Nguyen, [The Heighway Dragon Revisited](https://link.springer.com/article/10.1007/s00454-003-0778-7), Discrete & Computational Geometry 29 (2003), 603–623. Proves a decomposition into disk-like pieces with open interiors. Nonempty interior implies positive area and Hausdorff dimension 2. The [author repository](https://digitalcommons.georgiasouthern.edu/math-sci-facpubs/602/) provides the abstract freely. [Back](#dragon-curve-ref-2)
3. <span id="dragon-curve-source-3"></span> Michel Dekking, [Paperfolding morphisms, planefilling curves, and fractal tiles](https://arxiv.org/pdf/1011.5788), Theoretical Computer Science 414, no. 1 (2012), 20–37, sections 8–10. Discusses quarter-turned dragons and the passage from folding curves to tiles. The demo uses this explorer’s F/G rules, rotates each drawing to keep its endpoints fixed, and fills each segment with a square whose diagonal is that segment. Its four-copy groups repeat by shifts of (1, 1) and (1, −1), measured in endpoint distances. These finite square tiles and their placement are calculated directly from the implementation. [Back](#dragon-curve-ref-3)
