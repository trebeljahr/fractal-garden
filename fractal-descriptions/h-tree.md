# H Tree

The H Tree is about as simple as a fractal can get. Draw a horizontal line. At both of its ends, draw a vertical line, centered on that end and a little shorter. At the four new ends, draw horizontal lines again, and so on. After two steps you see a big letter H, and every tip of that H sprouts a smaller H, forever.

<figure data-investigation="h-tree"></figure>

The endpoint spacing depends on the shrink factor. Each new generation is shorter by

$$
r = \frac{1}{\sqrt{2}} \approx 0.7071
$$

so that two steps (one horizontal, one vertical) halve the length. With exactly this ratio the shape never overlaps itself, yet it comes arbitrarily close to every point of a rectangle with side ratio $\sqrt{2} : 1$ – the same shape as an A4 sheet of paper. The limit fills that rectangle, so its Hausdorff dimension is

$$
D = \frac{\log 4}{\log 2} = 2.
$$

Above $1/\sqrt{2}$, the branches overlap. Below that value, gaps remain between the smaller endpoint patterns. The connecting segments still form a tree.

The H Tree is not only pretty. Chip designers use it to route clock signals: equal-depth tips have equal path lengths from the center. That symmetry helps distribute a clock signal. Antenna designers use it for compact antennas too.

You may have noticed that the [Fractal Canopy](/fractal-canopy) has an H-Tree preset. A canopy with two branches at $180°$ is exactly this construction. It is also a close cousin of the [Pythagoras Tree](/pythagoras-tree), which branches in the same binary way but with squares and triangles. And the [T-Square Fractal](/t-square-fractal) does the same "put a smaller copy at every corner" trick with filled squares instead of lines.
