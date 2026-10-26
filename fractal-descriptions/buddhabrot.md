# Buddhabrot

Choose a number. Start at zero, square, add your chosen number, and repeat. This is the same calculation used for the [Mandelbrot set](/mandelbrot).

The Mandelbrot picture colors the pixel you chose. A Buddhabrot records the places the calculation visits along the way. If the results escape, put a faint dot at each saved position. If they don't, leave that route out.<sup><a id="buddhabrot-ref-1" href="#buddhabrot-source-1">1</a></sup>

Record the route below twice. Then add other routes. Watch how their separate dots build up a picture.

<figure data-investigation="buddhabrot"></figure>

A bright pixel has been visited often. A dark pixel has few or no recorded visits. Changing **Exposure** brightens the dots already collected; it does not add any new visits.

In the full explorer, **Min orbit length** leaves out short routes. **Max iterations** sets how long to wait for an escape. Routes that haven't escaped by then contribute nothing.

Melinda Green developed this method in 1993. Lori Gardi later supplied the name.

## A branching diagram inside

What happens if we keep the routes that don't escape? This is the **Anti-Buddhabrot** idea. Green found a connection to the [logistic map](/logistic-map) by changing which coordinates she plotted.<sup><a id="buddhabrot-ref-2" href="#buddhabrot-source-2">2</a></sup>

The next picture puts these routes into a three-dimensional cloud. Each later answer becomes a dot. Two coordinates place it at the chosen number in the Mandelbrot picture. Its depth comes from the answer's horizontal coordinate.

Seen from the front, all those answers overlap at the number that produced them. Turn the cloud sideways to separate them. Press **Play turn** and follow the amber dots.

<figure data-investigation="buddhabrot-connection"></figure>

At a quarter turn, only the amber slice remains: numbers chosen along the Mandelbrot picture's horizontal center line.<sup><a id="buddhabrot-ref-3" href="#buddhabrot-source-3">3</a></sup> Each column now shows the answers one calculation keeps approaching. One answer makes one branch; an alternating pair makes two.

Choose **Logistic map**. The same dots move to that map's usual coordinates, with branches splitting toward the right. This view covers its growth values from $1$ to $4$.

The two calculations are connected by a change of coordinates. Writing the logistic rule as $x_{n+1}=rx_n(1-x_n)$, set

$$
z=r\left(\frac12-x\right),\qquad c=\frac{r(2-r)}4.
$$

The rule becomes $z_{n+1}=z_n^2+c$, the square-and-add calculation we began with. Starting at $x=\frac12$ in one is starting at $z=0$ in the other.<sup><a id="buddhabrot-ref-4" href="#buddhabrot-source-4">4</a></sup>

## Further reading

- [Buddhabrot — Wikipedia](https://en.wikipedia.org/wiki/Buddhabrot)
- [The Buddhabrot Technique — Melinda Green](https://superliminal.com/fractals/bbrot/)

## Sources and notes

1. <span id="buddhabrot-source-1"></span> [The Buddhabrot Technique](https://superliminal.com/fractals/bbrot/) [Back](#buddhabrot-ref-1)
2. <span id="buddhabrot-source-2"></span> [The Logistic Connection](https://superliminal.com/fractals/bbrot/l-map/) [Back](#buddhabrot-ref-2)
3. <span id="buddhabrot-source-3"></span> **Diagram construction.** All routes start at zero. The figure tests 864 steps, omits the first 768, and plots later positions from routes that pass the test. This finite test approximates nonescape. The real slice uses 1,100 parameters strictly between −2 and ¼. The front view plots parameter coordinates, rather than the orbit coordinates of a standard Anti-Buddhabrot. [Back](#buddhabrot-ref-3)
4. <span id="buddhabrot-source-4"></span> [Math 5260 Dynamical Systems](https://www.d.umn.edu/~bpeckham/5260/F2001/Math5260F2001.html) (Homework Set 5, problem 9). [Back](#buddhabrot-ref-4)
