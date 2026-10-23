# Penrose Tiling

Look for five-pointed stars and rings that return in different parts of the picture. These local patterns repeat, but the complete tiling has no repeating translation. No shift of the whole plane makes every tile line up again.

The explorer draws two versions. **P2 kite and dart** uses kites and darts. **P3 rhombus** uses thick and thin rhombi. Both depend on the golden ratio:

$$
\varphi = \frac{1 + \sqrt{5}}{2} \approx 1.618
$$

## A fixed tiling, built through subdivision

The main view shows fixed tiles at different magnifications. The diagram below explains their construction using triangular halves. An acute half-kite has angles $36°, 72°, 72°$. An obtuse half-dart has angles $108°, 36°, 36°$. These are the two Robinson triangles used in the P2 construction.

<figure data-lesson="penrose"></figure>

An acute half becomes two acute halves and one obtuse half. An obtuse half becomes one of each. The cut divides an edge in the ratio $\varphi:1$.

This step is called **deflation**. The diagram keeps the outside boundary fixed while subdividing its interior. Whole kites and darts join mirrored halves. The main tiling keeps its tiles fixed as the view changes.

## Different patches share the same local rules

A sun patch has five kites meeting at their tips. A star patch has five darts. Their initial arrangements differ, while the subdivision preserves compatible neighbors.

The P3 construction uses thick and thin rhombi instead. Both families repeat across scales through rules tied to the golden ratio.

Local stars and rings recur without giving the whole plane a repeating translation. Repetition of a patch is weaker than periodicity of a tiling.

## Shape alone does not enforce the tiling

A Penrose tiling also needs rules for how neighboring tiles meet. The construction starts from compatible patches and preserves their arrangement as it subdivides them. The [Tilings Encyclopedia](https://tilings.math.uni-bielefeld.de/substitution/penrose-rhomb/) illustrates matching rules with connected marks on neighboring rhombi.

Counting the P2 halves gives another view of the golden ratio. If $k_n$ counts acute halves and $d_n$ counts obtuse halves:

$$
k_{n+1} = 2k_n + d_n, \qquad d_{n+1} = k_n + d_n
$$

Their ratio $k_n/d_n$ approaches $\varphi$ as the number of steps grows. The total count grows by a factor that approaches $\varphi^2$, about $2.618$.

## Is it a fractal?

The tiling fills the plane with straight-edged pieces. Its dimension is $2$. Its link to this garden is the repeated construction across scales. Larger groups of tiles follow the same organization as smaller ones.

The [Fibonacci word fractal](/l-system/fibonacci-word-fractal) also grows through a replacement rule tied to the golden ratio. The [N-flake](/n-flake) uses related pentagonal angles. The [Sierpinski triangle](/l-system/sierpinski-triangle) uses subdivision to remove regions instead of filling a whole area.

## A five-dimensional lattice behind the rhombi

The **P3 rhombus** tiling also has a higher-dimensional construction. Start with an integer lattice in five dimensions. Select lattice points using a bounded window in the complementary space, then project the selected points onto a two-dimensional plane. The window selects which points belong to the tiling.

This is **cut and project**. Projecting every lattice point without the window would not produce the discrete Penrose pattern. The selected projection gives the thick and thin rhombi, with five possible orientations for each.

De Bruijn developed this description of Penrose tilings. His [Encyclopedia of Mathematics account](https://encyclopediaofmath.org/wiki/Penrose_tiling) connects the projection method with pentagrids. The [Simons Center illustrates the five-dimensional construction](https://scgp.stonybrook.edu/archives/17092). This explorer builds its patches by subdivision; it does not display the five-dimensional lattice.

The [Rauzy fractal](/rauzy-fractal) also turns a higher-dimensional lattice walk into a planar shape. Its projection keeps bounded deviations from an expanding direction.
