# Mandelbulb

Move around the bulb and look for smaller bulbs on its surface. Grooves split into finer grooves. The rule keeps making detail at smaller sizes.

The [Mandelbrot set](/mandelbrot) tests points on a flat plane. This construction tests points in three-dimensional space.

<figure data-investigation="mandelbulb"></figure>

## Wrap around, then add

Choose a point $\mathbf c$ and start at the center. Measure the moving point's distance from the center and its two angles around it.

The default rule raises that distance to the eighth power and multiplies both angles by eight. Then add $\mathbf c$. Repeat with the same $\mathbf c$ each time.

Points whose journeys stay bounded belong to the bulb. Escaping journeys belong outside it. As with the Mandelbrot set, the computer can test only a finite number of steps.

Daniel White published his spherical-coordinate construction in 2007. Paul Nylander later tried higher powers. The eighth-power images drew attention in 2009.<sup><a id="mandelbulb-ref-1" href="#mandelbulb-source-1">1</a></sup>

**Power** changes the rule itself. Try another value and watch the arrangement of lobes change.

## How the surface appears

For each pixel, the renderer follows a ray into the scene. It estimates how far it can move before reaching the bulb. Small steps near the surface reveal the bumps and grooves.

Those estimates have limits. Zooming eventually reveals what the renderer can resolve, rather than all the detail of the mathematical shape.

The colors use how close the journeys pass to the center and coordinate planes. The [Julia explorer](/julia-set) shows another kind of square-and-add picture on a flat plane.

## Sources and notes

1. <span id="mandelbulb-source-1"></span> Daniel White, [Mandelbulb: The Unravelling of the Real 3D Mandelbrot Fractal](https://www.skytopia.com/project/fractal/mandelbulb.html), 8 November 2009, and his linked [2007 construction account](https://www.skytopia.com/project/fractal/mandelbrot.html). Creator's history credits Nylander's higher-power experiments. The eighth-power rule and rendering method describe this explorer. [Back](#mandelbulb-ref-1)
