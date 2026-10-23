# Buddhabrot

For a Mandelbrot picture, each pixel's coordinates provide the fixed number used in an escape test. A Buddhabrot records the route taken by the calculations that do escape.

Start at zero, square, add the chosen number, and repeat. Save the intermediate positions. If the sequence escapes, add a faint dot at each saved position. Otherwise, discard the route and try another number.<sup><a id="buddhabrot-ref-1" href="#buddhabrot-source-1">1</a></sup>

<figure data-investigation="buddhabrot"></figure>

Each recorded visit increases a pixel's counter. A pixel with more visits is displayed more brightly. Accumulating many escaping sequences produces the image.

**Min orbit length** filters out short routes. **Max iterations** sets how long the computer waits for an escape. Routes that haven't escaped by then add nothing to the picture.

**Exposure** changes how bright the accumulated dots appear. It doesn't change which routes were recorded.

Melinda Green developed the method in 1993. Lori Gardi later supplied the name.

## Sources and notes

1. <span id="buddhabrot-source-1"></span> Melinda Green, [The Buddhabrot Technique](https://superliminal.com/fractals/bbrot/), creator's account of the method developed in 1993. Describes escaping-orbit accumulation, Gardi's naming, and separate color-channel thresholds. [Back](#buddhabrot-ref-1)
