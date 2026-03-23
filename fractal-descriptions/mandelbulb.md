# Mandelbulb

The Mandelbulb is one of the best-known attempts to build a three-dimensional relative of the [Mandelbrot Set](/mandelbrot). Instead of iterating points in the complex plane, it applies a power-like transformation in spherical coordinates, then adds the original point back in again. Points that do not escape under that process belong to the set.

That gives the Mandelbulb the same basic spirit as the [Julia Set](/julia-set) and the Mandelbrot view: a tiny iterative rule creates an object with an enormous amount of structure packed into its boundary. The difference is that here the structure lives in space rather than on a flat plane.

Because the Mandelbulb is a 3D object, it is usually rendered with **ray marching** rather than polygons. Instead of tracing triangles, the renderer estimates how far a ray can safely travel before it gets close to the surface. Repeating that estimate over and over makes it possible to shade the bulb as if it were a solid sculpture.

The version here lets you orbit by dragging, zoom with the mouse wheel, and pan by holding `Shift` while dragging. That makes it easier to move between the overall bulb shape and the smaller folds that start to echo the recursive detail seen in other fractals like the [Menger Sponge](/menger-sponge).
