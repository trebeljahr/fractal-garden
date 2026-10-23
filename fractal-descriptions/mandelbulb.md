# Mandelbulb

The Mandelbulb applies a repeated calculation to points in three dimensions. Each point supplies a fixed position to add, and the calculation starts at the origin.

At every step, measure the current point's distance from the origin and its two angles. The default rule raises the distance to the eighth power and multiplies both angles by eight. Convert that back to a position, add the fixed position, then repeat.

<figure data-investigation="mandelbulb"></figure>

At the origin, the power step returns zero. The first addition therefore moves to the chosen point. Later positions either stay within a fixed distance of the origin or increase their distance without limit. The boundary between the two outcomes forms the bulb's surface.

The [Mandelbrot set](/mandelbrot) uses a related calculation in two dimensions. This spherical rule extends the distance-and-angle operation to three dimensions. **Power** changes both the distance calculation and the angle multipliers, so it changes the shape itself.

Daniel White published the construction in 2007. Paul Nylander's later higher-power experiments led to the eighth-power images made in 2009.<sup><a id="mandelbulb-ref-1" href="#mandelbulb-source-1">1</a></sup>

The renderer tests positions along a line through each pixel. It estimates their distance from the surface and takes smaller steps near it. These estimates and the limited number of repeated calculations restrict the detail visible at deep zoom levels.

## Sources and notes

1. <span id="mandelbulb-source-1"></span> Daniel White, [Mandelbulb: The Unravelling of the Real 3D Mandelbrot Fractal](https://www.skytopia.com/project/fractal/mandelbulb.html), 8 November 2009, and his linked [2007 construction account](https://www.skytopia.com/project/fractal/mandelbrot.html). Creator's history credits Nylander's higher-power experiments. [Back](#mandelbulb-ref-1)
