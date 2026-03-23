# Julia Set

The Julia Set is one of the closest relatives of the [Mandelbrot Set](/mandelbrot). Both use the same quadratic iteration

$$
z_{n+1} = z_n^2 + c
$$

but they use it in different ways.

For the Mandelbrot Set, the point `c` changes across the plane and the iteration always starts at `z = 0`. For a Julia Set, `c` is fixed ahead of time, and the starting value `z` changes from pixel to pixel instead.

That means every choice of `c` gives a different Julia Set. Some look like dust, some look like branching lightning, and some look like islands connected by thin filaments.

This is the reason the Mandelbrot Set and Julia Sets are so tightly connected: points in the Mandelbrot parameter plane correspond to families of Julia Sets. Exploring different values of `c` is really a way of slicing through that larger picture.

The version here lets you pick a few interesting presets and also adjust the real and imaginary parts of `c` directly. Because it uses a WebGL shader, you can also zoom in and move around just like in the [Burning Ship Fractal](/burning-ship) or the Mandelbrot view.
