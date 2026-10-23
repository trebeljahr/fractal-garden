# Dragon Curve

Fold a strip of paper repeatedly in half, always in the same direction. Unfold its creases into right angles: the resulting route is a Heighway dragon. Paper folding and recursive edge replacement give two ways to make the same family of paths.<sup><a id="dragon-curve-ref-1" href="#dragon-curve-source-1">1</a></sup>

This page starts with F and rewrites `F → F+G` and `G → F-G`. Both letters draw one forward stroke. Plus turns counterclockwise by 90 degrees, and minus turns clockwise. Replacements happen simultaneously, so newly inserted symbols wait until the next rewrite.

<figure data-construction-player="lsystem-dragon"></figure>

Each letter makes two forward letters. After $n$ rewrites, the path contains $2^n$ strokes. With unit strokes, its endpoint chord has length $(\sqrt{2})^n$ and turns through another 45 degrees per rewrite. Holding that chord fixed therefore shrinks each new stroke by $1/\sqrt{2}$.

The two-part similarity count gives $\log2/\log\sqrt{2}=2$. Here the limiting image actually has area. The outer boundary is a smaller subset of that image: the complete dragon path does more than trace an outline.<sup><a id="dragon-curve-ref-2" href="#dragon-curve-source-2">2</a></sup>

The [Lévy curve](/l-system/levy-curve) also uses two pieces at scale $1/\sqrt{2}$, but arranges their orientations differently. Two back-to-back dragons form the [Twindragon](/l-system/twindragon). Change the word yourself in the [L-system explorer](/l-system/explorer), or compare its right-angle routing with the [Hilbert curve](/l-system/hilbert-curve).

## Sources and notes

1. <span id="dragon-curve-source-1"></span> Tobey Mathis and Kiko Kawamura, [Revolving sequences and Terdragon](https://arxiv.org/html/2106.10549), arXiv:2106.10549, 2021, section 1. Describes the Heighway dragon’s paper-folding origin. The word, stroke count and chord calculation above follow the renderer’s two-letter rule. [Back](#dragon-curve-ref-1)
2. <span id="dragon-curve-source-2"></span> Sze-Man Ngai and Nhu Nguyen, [The Heighway Dragon Revisited](https://link.springer.com/article/10.1007/s00454-003-0778-7), Discrete & Computational Geometry 29 (2003), 603–623. Proves a decomposition into disk-like pieces with open interiors. Nonempty interior implies positive area and Hausdorff dimension 2. The [author repository](https://digitalcommons.georgiasouthern.edu/math-sci-facpubs/602/) provides the abstract freely. [Back](#dragon-curve-ref-2)
