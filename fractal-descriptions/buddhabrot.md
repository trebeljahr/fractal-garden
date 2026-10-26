# Buddhabrot

For a Mandelbrot picture, each pixel's coordinates provide the fixed number used in an escape test. A Buddhabrot records the route taken by the calculations that do escape.

Start at zero, square, add the chosen number, and repeat. Save the intermediate positions. If the sequence escapes, add a faint dot at each saved position. Otherwise, discard the route and try another number.<sup><a id="buddhabrot-ref-1" href="#buddhabrot-source-1">1</a></sup>

<figure data-investigation="buddhabrot"></figure>

Each recorded visit increases a pixel's counter. A pixel with more visits is displayed more brightly. Accumulating many escaping sequences produces the image.

**Min orbit length** filters out short routes. **Max iterations** sets how long the computer waits for an escape. Routes that haven't escaped by then add nothing to the picture.

**Exposure** changes how bright the accumulated dots appear. It doesn't change which routes were recorded.

Melinda Green developed the method in 1993. Lori Gardi later supplied the name.

## A branching diagram inside

Keep the routes that do not escape instead. This is the **Anti-Buddhabrot** idea. Melinda Green found the logistic map by changing which coordinates she plotted.<sup><a id="buddhabrot-ref-2" href="#buddhabrot-source-2">2</a></sup>

The figure below gives each dot three coordinates. Two locate the chosen number in the Mandelbrot plane. The third records the horizontal position of a later step along its route. Look straight at the plane and those later steps overlap. You see the Mandelbrot shape.

Press **Play turn**. The later positions rotate into view. At a quarter turn, the figure keeps only the amber dots: routes whose chosen numbers lie on the horizontal center line.<sup><a id="buddhabrot-ref-3" href="#buddhabrot-source-3">3</a></sup>

<figure data-investigation="buddhabrot-connection"></figure>

Each column shows the values one route keeps visiting. One branch means the values settle near one number. Two branches mean they alternate between two. Further left, the branches split again.

Choose **Logistic map** to change the axes to its usual coordinates. The branches now split toward the right. This view shows growth values $r$ from 1 to 4. You can follow a single calculation in the [logistic-map lesson](/logistic-map).

The logistic rule is $x_{n+1}=rx_n(1-x_n)$. Change coordinates using

$$
z=r\left(\frac12-x\right),\qquad c=\frac{r(2-r)}4.
$$

Then the rule becomes $z_{n+1}=z_n^2+c$: the same square-and-add calculation used for Mandelbrot and Buddhabrot. Starting at $z=0$ corresponds to starting at $x=\frac12$.<sup><a id="buddhabrot-ref-4" href="#buddhabrot-source-4">4</a></sup>

## Further reading

- [Buddhabrot — Wikipedia](https://en.wikipedia.org/wiki/Buddhabrot)
- [The Buddhabrot Technique — Melinda Green](https://superliminal.com/fractals/bbrot/)

## Sources and notes

1. <span id="buddhabrot-source-1"></span> [The Buddhabrot Technique](https://superliminal.com/fractals/bbrot/) [Back](#buddhabrot-ref-1)
2. <span id="buddhabrot-source-2"></span> [The Logistic Connection](https://superliminal.com/fractals/bbrot/l-map/) [Back](#buddhabrot-ref-2)
3. <span id="buddhabrot-source-3"></span> **Diagram construction.** All routes start at zero. The figure tests 864 steps, omits the first 768, and plots later positions from routes that pass the test. This finite test approximates nonescape. The real slice uses 1,100 parameters strictly between −2 and ¼. The front view plots parameter coordinates, rather than the orbit coordinates of a standard Anti-Buddhabrot. [Back](#buddhabrot-ref-3)
4. <span id="buddhabrot-source-4"></span> [Math 5260 Dynamical Systems](https://www.d.umn.edu/~bpeckham/5260/F2001/Math5260F2001.html) (Homework Set 5, problem 9). [Back](#buddhabrot-ref-4)
