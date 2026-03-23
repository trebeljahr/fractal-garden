# Buddhabrot

The Buddhabrot is closely related to the [Mandelbrot Set](/mandelbrot), but it is drawn in a very different way. Instead of coloring each point by how quickly it escapes, we look at the full orbit of points that do escape and count where those orbits travel through the complex plane.

That means we still start from the same quadratic iteration

$$
z_{n+1} = z_n^2 + c
$$

but the picture is built from the path of each escaping orbit rather than from the point $c$ itself.

If a sampled point stays bounded, it does not contribute anything to the image. If it escapes, every intermediate value in its orbit is plotted into a histogram. After collecting many thousands of those paths, brighter regions appear where many different orbits pass through the same area.

This makes the Buddhabrot feel a bit like an x-ray of the Mandelbrot Set. It shows the flow around the set rather than just its boundary.