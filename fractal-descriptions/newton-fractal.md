# Newton Fractal

The Newton Fractal comes from [Newton's method](https://en.wikipedia.org/wiki/Newton%27s_method), a classic technique for finding roots of an equation. On the complex plane, you choose a starting value, apply the Newton update over and over, and watch which root the sequence converges to.

For the version shown here, the equation is

$$
f(z) = z^3 - 1
$$

which has three roots:

$$
1,\quad -\frac{1}{2} + \frac{\sqrt{3}}{2}i,\quad -\frac{1}{2} - \frac{\sqrt{3}}{2}i
$$

Each color shows one of those three destinations. Points with the same color all converge to the same root, while the intricate boundaries between the colors show where the behavior is extremely sensitive to the starting value.

That is what makes the picture fractal. A tiny change near one of those boundaries can send the iteration to a completely different root.

The Newton Fractal is a little different from escape-time fractals like the [Mandelbrot Set](/mandelbrot) or the [Burning Ship Fractal](/burning-ship), but they all share the same idea of iterating a rule in the complex plane and coloring points by how that iteration behaves.
