# Buddhabrot

A Buddhabrot counts the places that escaping Mandelbrot orbits visit. A bright pixel means many recorded visits to that location.

Choose a complex parameter $c$, start at zero, and iterate:

$$
z_0=0,\qquad z_{n+1}=z_n^2+c.
$$

If the orbit escapes, add its recorded positions to a grid of counters. Repeat for many randomly sampled parameters. The image gradually resolves as those counters accumulate.

<figure data-investigation="buddhabrot"></figure>

The [Mandelbrot explorer](/mandelbrot) colors the location of $c$. The Buddhabrot deposits visits at the locations of $z_1,z_2,\ldots$. These are different coordinates with different meanings. An escaping parameter can send its orbit through a region whose *parameters* belong to the Mandelbrot set.

Melinda Green developed the method in 1993. Artist Lori Gardi later supplied its name. Green also combined three orbit histograms with different iteration limits into red, green and blue channels. Those colors distinguish orbit populations rather than wavelengths.<sup><a id="buddhabrot-ref-1" href="#buddhabrot-source-1">1</a></sup>

This explorer records an orbit only when it exceeds radius two within **Max iterations** and meets **Min orbit length**. An unresolved orbit contributes nothing, even if it would escape later. Raising the maximum therefore adds a different population of paths. Raising the minimum removes short paths.

The implementation samples the upper half-plane and reflects each recorded visit across the real axis. This uses conjugate symmetry: conjugating $c$ conjugates every iterate. That statement follows directly from the recurrence.

**Exposure** changes the logarithmic display of the counters. It reveals faint trails without changing the recorded orbits.

## Sources and notes

1. <span id="buddhabrot-source-1"></span> Melinda Green, [The Buddhabrot Technique](https://superliminal.com/fractals/bbrot/), creator's account of the method developed in 1993. Describes escaping-orbit accumulation, Gardi's naming, and separate color-channel thresholds. Sampling, reflection and exposure details above describe this explorer. [Back](#buddhabrot-ref-1)
