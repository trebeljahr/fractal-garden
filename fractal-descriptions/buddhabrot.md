# Buddhabrot

The [Mandelbrot set](/mandelbrot) asks whether a point escapes. The Buddhabrot asks where it went along the way.

Choose a number $c$. Start at zero, square it, add $c$, and repeat:

$$
z_{n+1}=z_n^2+c.
$$

If the point escapes, draw its earlier stops. Then try another $c$. Places that get more visits grow brighter.

<figure data-investigation="buddhabrot"></figure>

Each escaping journey adds a faint trail. Many trails together make the picture. Melinda Green developed this method in 1993. Lori Gardi later named it the Buddhabrot.<sup><a id="buddhabrot-ref-1" href="#buddhabrot-source-1">1</a></sup>

The location of $c$ chooses the journey. The bright dots show the journey's stops. Those can be far apart, which is why this picture differs from the Mandelbrot set.

## Which journeys count?

**Max iterations** sets how long the explorer waits for an escape. A journey that does not escape in time adds no dots.

**Min orbit length** removes short journeys. Raise it to keep only paths that wander longer before escaping.

**Exposure** brightens faint trails without adding new visits. The explorer also reflects each trail across the horizontal axis. The square-and-add rule has the same symmetry.

## Sources and notes

1. <span id="buddhabrot-source-1"></span> Melinda Green, [The Buddhabrot Technique](https://superliminal.com/fractals/bbrot/), creator's account of the method developed in 1993. Describes escaping-orbit accumulation, Gardi's naming, and separate color-channel thresholds. Sampling, reflection and exposure details above describe this explorer. [Back](#buddhabrot-ref-1)
