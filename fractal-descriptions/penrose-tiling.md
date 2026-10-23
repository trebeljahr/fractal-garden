# Penrose Tiling

Look for five-pointed stars and rings that return in different parts of the picture. These local patterns repeat, but the complete tiling has no repeating translation. No shift of the whole plane makes every tile line up again.

The explorer draws two versions. **P2 kite and dart** uses kites and darts. **P3 rhombus** uses thick and thin rhombi. Both depend on the golden ratio:

$$
\varphi = \frac{1 + \sqrt{5}}{2} \approx 1.618
$$

## Explore the infinite tiling

Drag to pan in any direction. Scroll or pinch to zoom in and out. The tiling extends beyond every edge of the view.

Open **Fractal Studio Controls** to switch between **P2 kite and dart** and **P3 rhombus**. Under **Pattern**, compare **Sun** with **Star**. You can also change the rotation, tile colors, and outlines.

Zooming keeps the same tiles in place. Zoom out to see more of the pattern, or zoom in to inspect individual tiles. **Reset view** returns to the opening view.

## Shape alone does not enforce the tiling

A Penrose tiling also needs rules for how neighboring tiles meet. The construction starts from compatible patches and preserves their arrangement as it subdivides them. The [Tilings Encyclopedia](https://tilings.math.uni-bielefeld.de/substitution/penrose-rhomb/) illustrates matching rules with connected marks on neighboring rhombi.

## Is it a fractal?

The tiling fills the plane with straight-edged pieces. Its dimension is $2$. Its link to this garden is the repeated construction across scales. Larger groups of tiles follow the same organization as smaller ones.

The [Fibonacci word fractal](/l-system/fibonacci-word-fractal) also grows through a replacement rule tied to the golden ratio. The [N-flake](/n-flake) uses related pentagonal angles. The [Sierpinski triangle](/l-system/sierpinski-triangle) uses subdivision to remove regions instead of filling a whole area.

## A five-dimensional lattice behind the rhombi

The **P3 rhombus** tiling also has a higher-dimensional construction. Start with an integer lattice in five dimensions. Select lattice points using a bounded window in the complementary space, then project the selected points onto a two-dimensional plane. The window selects which points belong to the tiling.

This is **cut and project**. Projecting every lattice point without the window would not produce the discrete Penrose pattern. The selected projection gives the thick and thin rhombi, with five possible orientations for each.

De Bruijn developed this description of Penrose tilings. His [Encyclopedia of Mathematics account](https://encyclopediaofmath.org/wiki/Penrose_tiling) connects the projection method with pentagrids. The [Simons Center illustrates the five-dimensional construction](https://scgp.stonybrook.edu/archives/17092). This explorer builds its patches by subdivision; it does not display the five-dimensional lattice.

The [Rauzy fractal](/rauzy-fractal) also turns a higher-dimensional lattice walk into a planar shape. Its projection keeps bounded deviations from an expanding direction.
