# Mandelbulb

The Mandelbulb is one of the best-known attempts to build a three-dimensional relative of the [Mandelbrot Set](/mandelbrot). Instead of iterating points in the complex plane, it applies a power-like transformation in spherical coordinates, then adds the original point back in again. Points that do not escape under that process belong to the set.

<figure data-investigation="mandelbulb"></figure>

That gives the Mandelbulb the same basic spirit as the [Julia Set](/julia-set) and the Mandelbrot view: a tiny iterative rule creates an object with an enormous amount of structure packed into its boundary. The difference is that here the structure lives in space rather than on a flat plane.

Because the Mandelbulb is a 3D object, it is usually rendered with **ray marching** rather than polygons. Instead of tracing triangles, the renderer estimates how far a ray can safely travel before it gets close to the surface. Repeating that estimate over and over makes it possible to shade the bulb as if it were a solid sculpture.

The power operation treats radius and angles differently. A radius below one shrinks under a higher power, while angular multiplication folds directions around the sphere.

[Daniel White’s construction account](https://www.skytopia.com/project/fractal/mandelbulb.html) traces the spherical-power idea and its higher-power forms.
