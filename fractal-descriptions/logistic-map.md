# Logistic Map

The Logistic Map comes from a very small equation:

$$
x_{n+1} = r x_n (1 - x_n)
$$

Even though it looks simple, changing the parameter `r` produces an enormous range of behaviour. For smaller values, the iteration settles down to one stable number. Increase `r` a little further and that stable value splits into two. Then those two split into four, then eight, and eventually the pattern spills over into chaos.

The usual way to see all of that at once is to draw a **bifurcation diagram**. For each value of `r`, the iteration is run many times, the early transient values are discarded, and only the long-term values are plotted. That is why the image looks like a branching tree made out of dots.

The Logistic Map is not a geometric fractal in the same way as the [Apollonian Gasket](/apollonian-gasket) or the [2D Vicsek Fractal](/vicsek-fractal-2d), but it belongs to the same world of recursive rules producing unexpectedly rich structure. It also has the same feeling as the [Julia Set](/julia-set) and the [Mandelbrot Set](/mandelbrot): a very small iteration rule can hide an extraordinary amount of detail once you start to zoom in.

The version here lets you pan and zoom through the bifurcation diagram directly, so you can move from the full route to chaos into the tiny windows where order briefly reappears.
