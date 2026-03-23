# Burning Ship Fractal

The Burning Ship is an [escape-time fractal](https://en.wikipedia.org/wiki/Burning_Ship_fractal) that is very closely related to the [Mandelbrot Set](/mandelbrot). Both start from the same quadratic iteration, but the Burning Ship takes the absolute value of the real and imaginary parts before squaring. That small change folds the orbit back toward the axes and creates the sharp flame-like ridges that give the fractal its name.

This page uses a WebGL shader, so every pixel is iterated directly on the GPU. The core update step looks like this:

```glsl
z = complexSquare(abs(z)) + c;
```

In expanded form, that means:

```ts
const nextReal = abs(real) * abs(real) - abs(imag) * abs(imag) + cReal;
const nextImag = 2 * abs(real) * abs(imag) + cImag;
```

Just like the Mandelbrot Set, points that never escape belong to the fractal, while points that do escape can be colored by how quickly they diverge. The Burning Ship is especially fun to zoom into because tiny regions often look like stacked sails, towers, or little flickering embers.

Hold the mouse button to zoom in. Hold `Ctrl` while clicking to zoom back out.

Because it is built from the same escape-time idea, this fractal sits in the same family as the [Mandelbrot Set](/mandelbrot), the requested Buddhabrot, and Julia-style quadratic fractals.
