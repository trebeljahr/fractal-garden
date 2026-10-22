# Penrose Tiling

Look for five-pointed stars and rings that return in different parts of the picture. These local patterns repeat, but the complete tiling has no repeating translation. No shift of the whole plane makes every tile line up again.

The explorer draws two versions. **P2 kite and dart** uses kites and darts. **P3 rhombus** uses thick and thin rhombi. Both depend on the golden ratio:

$$
\varphi = \frac{1 + \sqrt{5}}{2} \approx 1.618
$$

## Keep a boundary while the pieces shrink

The construction works with triangular halves of the tiles. An acute half-kite has angles $36°, 72°, 72°$. An obtuse half-dart has angles $108°, 36°, 36°$. These are the two Robinson triangles used in the P2 construction.

<figure data-lesson="penrose"></figure>

Choose each parent to compare its first split. An acute half becomes two acute halves and one obtuse half. An obtuse half becomes one of each. The marked cut divides an edge in the ratio $\varphi : 1$.

This step is called **deflation**. The outside boundary stays fixed while each piece gains smaller pieces inside it. The explorer joins mirrored halves when it draws whole kites and darts.

## Follow the same cuts in the explorer

Open **Pattern Studio** and turn off **Animate growth**. Set **Variant** to **P2 kite and dart**, then increase **Iterations** one step at a time. Keep **Frame start patch** on to compare the new cuts against the original patch.

Under **Start**, compare **Sun** with **Star**. The P2 sun starts with five kites meeting at their tips. The P2 star starts with five darts. Switch **Variant** to **P3 rhombus** to compare a different subdivision using thin and thick rhombi.

Drag to move through the tiling. Scroll or pinch to zoom. The renderer extends the patch around the view as needed. Zooming out stops before the small tiles lose their detail.

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
