# Penrose Tiling

A Penrose tiling covers the whole plane with just two shapes, yet it never repeats. You can slide a copy of the tiling in any direction you like, it will never land on itself again. Tilings like this are called [aperiodic](https://en.wikipedia.org/wiki/Aperiodic_tiling). Roger Penrose found these sets of tiles in the 1970s, and a few years later the same kind of order turned up in real materials: quasicrystals, whose discovery earned Dan Shechtman the 2011 Nobel Prize in Chemistry.

There are two famous versions you can switch between here. The P2 tiling uses a **kite** and a **dart**. The P3 tiling uses a **thick** and a **thin rhombus**. Both carry the [golden ratio](https://en.wikipedia.org/wiki/Golden_ratio) everywhere:

$$
\varphi = \frac{1 + \sqrt{5}}{2} \approx 1.618
$$

The long and short sides of the kite and dart are in ratio $\varphi$, and in a large patch there are $\varphi$ times as many kites as darts (and $\varphi$ times as many thick rhombi as thin ones).

## Robinson triangles

The way this page builds the tiling is by cutting every tile in half along its mirror axis. The halves are two isosceles triangles, called [Robinson triangles](https://en.wikipedia.org/wiki/Penrose_tiling#Robinson_triangle_decompositions): an acute one with angles $36°, 72°, 72°$ and an obtuse one with angles $108°, 36°, 36°$. Both have sides in ratio $1 : \varphi$.

The trick is that each of these triangles can be cut into smaller copies of the same two triangles, all shrunk by the factor $1/\varphi$. In P2 an acute half-kite becomes two half-kites and one half-dart, and an obtuse half-dart becomes one half-kite and one half-dart. This step is called **deflation**. Repeat it and the tiles get smaller and smaller while the picture stays the same size, which is what the iterations slider does. Because the tiling looks the same at every scale, a fully deflated plane on its own would look like the view zooming out. So the page keeps the start patch framed in light lines: each iteration splits the tiles inside that fixed frame into smaller ones. When drawing, mirrored halves are glued back together, so you see whole kites, darts and rhombi.

Deflation also gives a way to show the whole infinite tiling. The sun and star patches reappear at their own center after four deflations of a copy that is $\varphi^4$ times larger. So the page starts from a patch big enough to cover the screen and deflates only the triangles that touch the view. Drag in any direction and new tiles appear. Zoom far out and the page draws the bigger supertiles instead, which form a Penrose tiling too.

Counting tiles shows the golden ratio again. If $k_n$ and $d_n$ are the numbers of half-kites and half-darts after $n$ deflations, then

$$
k_{n+1} = 2k_n + d_n, \qquad d_{n+1} = k_n + d_n,
$$

so the total grows by a factor of $\varphi^2 \approx 2.618$ per step and $k_n / d_n \to \varphi$.

## Is it a fractal?

Not in the classic sense. Every tile has straight edges and the tiling fills the plane, so its Hausdorff dimension is simply $2$, unlike the $\log 3 / \log 2 \approx 1.585$ of the [Sierpinski Triangle](/l-system/sierpinski-triangle). What it shares with the other plants in this garden is **self-similarity under inflation**: glue the small halves back into bigger tiles and you get a Penrose tiling again, with tiles $\varphi$ times larger. Any finite patch you can see here also turns up again, infinitely often, somewhere else in the infinite tiling.

## Sun and star

The two starting configurations are named after John Conway's vertex patterns: the **sun** is five kites meeting at their pointed ends, the **star** is five darts meeting at theirs. In the P3 version the sun starts from a decagon of half thin rhombi, and the star from five thick rhombi. Both have five-fold symmetry, which no periodic tiling can have.

If you like the golden ratio, look at the [Fibonacci Word Fractal](/l-system/fibonacci-word-fractal), which is built from a substitution rule that grows by $\varphi$ in the same way. The pentagon-shaped [N-Flake](/n-flake) is full of the same $36°$ and $72°$ angles.
