# Jerusalem Cube

The Jerusalem cube replaces a cube with smaller cubes of two sizes. Eight larger copies sit at the corners and twelve smaller copies sit between them along the edges, and the spaces left between them form cross-shaped openings.

Eric Baird devised this construction in 2010.<sup><a id="jerusalem-cube-ref-1" href="#jerusalem-cube-source-1">1</a></sup>

<figure data-construction-player="jerusalem-cube"></figure>

The corner cubes are about 41.4% as wide as the original, and that number comes from one edge. Along each edge sit a corner cube, an edge cube and another corner cube, and their widths must add up to the edge's length.

That alone allows many sizes, because a wider corner cube just leaves less room for a thinner edge cube. A second rule settles it: if a corner cube is $k$ times as wide as the original, the edge cube is $k$ times as wide as the corner cube. It then has the same width as the small cube the next level puts in that corner cube's corner, so the two meet face to face. The faint squares below are those small cubes.

<figure data-lesson="jerusalem-fit"></figure>

Drag the width. Below 0.414, the three widths fall short of the edge and amber marks the gaps. Above it, they run past the edge and amber marks the overlaps. At 0.414 the edge cube is 0.172 wide, and 0.414 + 0.172 + 0.414 = 1.<sup><a id="jerusalem-cube-ref-2" href="#jerusalem-cube-source-2">2</a></sup>

Because the edge cubes are already the size of a corner cube's corner cube, the level control counts them as two steps. Level 2 splits only the corner cubes, and level 3 splits the edge cubes too.

## Further exploring

- [Jerusalem cube — Wikipedia](https://en.wikipedia.org/wiki/Menger_sponge#Jerusalem_cube)
- [Cross Menger (Jerusalem) Cube Fractal — Robert Dickau](https://www.robertdickau.com/jerusalemcube.html)
- [Jerusalem Menger Cube — Paul Bourke](https://paulbourke.net/fractals/polyhedral/)

## Sources and notes

1. <span id="jerusalem-cube-source-1"></span> Eric Baird, [Jerusalem Cube](https://www.coroflot.com/erkdemon/Jerusalem-Cube), creator’s portfolio. Baird states that he devised it in 2010, before his 2011 blog description. [Back](#jerusalem-cube-ref-1)
2. <span id="jerusalem-cube-source-2"></span> Calculation. This explorer uses $k = \sqrt2 - 1$ for a corner cube and $k^2$ for an edge cube. Those widths fit because $2k + k^2 = 1$, and $\sqrt2 - 1$ is the only positive solution. [Back](#jerusalem-cube-ref-2)
