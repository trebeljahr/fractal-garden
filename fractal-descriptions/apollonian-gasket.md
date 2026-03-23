# Apollonian Gasket

The Apollonian Gasket begins with a small group of circles that all touch each other. Every time three circles form a curved triangular gap, there is exactly one more circle that fits into that gap while touching all three. If you keep repeating that step, the gaps fill with smaller and smaller tangent circles and a dense circle packing begins to appear.

The key idea behind the construction is Descartes' theorem. Instead of thinking in terms of radius, it is often easier to use **curvature**, which is just `1 / r`. Once three tangent circles and the circle on the other side of the gap are known, the curvature of the next circle can be computed directly, so the whole packing can be grown recursively.

That makes this fractal feel very different from square-based constructions like the [2D Vicsek Fractal](/vicsek-fractal-2d) or the [Sierpinski Carpet](/sierpinski-carpet), but the recursive spirit is the same. The version here starts from a symmetric four-circle arrangement and keeps filling every gap, so the gasket slowly turns from a few broad arcs into a web of tiny circles.
