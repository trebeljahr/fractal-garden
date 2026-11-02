# Mandelbrot Set

Start with zero. Square it, then add $1$. Use the answer as your next starting number and repeat:

$$
0\to1\to2\to5\to26\to\cdots
$$

The answers grow larger and larger. Now add $-1$ each time instead. You get $0,-1,0,-1,\ldots$: the same two numbers, forever.

The Mandelbrot picture tests which numbers you can add without the answers growing beyond every limit.

<figure data-article-images="mandelbrot"></figure>

Each pixel gives us a number to try. Its horizontal coordinate tells us how far to move left or right; its vertical coordinate tells us how far to move up or down. Together, these form a **complex number**, which we call $c$.

Adding $c$ moves the point by those two amounts. Squaring changes both its distance from zero and its direction: multiply the distance by itself and double the angle from the line pointing right.<sup><a id="mandelbrot-ref-1" href="#mandelbrot-source-1">1</a></sup>

In the picture below, the ring marks the number you chose. The amber point starts at zero and jumps once for each square and add. If it crosses the dashed circle, two units from zero, every later jump takes it farther away.<sup><a id="mandelbrot-ref-2" href="#mandelbrot-source-2">2</a></sup> The ring starts on $-1$, so press **Play** to see the repeat. Then pick a pixel near $1$ on the horizontal axis and watch the point leave.

<figure data-orbit="mandelbrot"></figure>

A number belongs to the Mandelbrot set if its results stay within a fixed distance of zero forever. The computer cannot wait forever, so black means “hasn't escaped yet.” Other colors show how long escape took.

Move the slider to choose how many steps the computer calculates before it stops. In **Whole set**, more steps turn black pixels into colored ones until the heart and the bulb appear.

**Spiral** shows a tiny piece of the edge, near the neck. At 200 steps it has round black dots that look like small bulbs. By 1000 steps, almost all of that black is gone. Those points were outside the set all along.

<figure data-lesson="step-limit-mandelbrot"></figure>

Points near the neck can take much longer. Start at $-0.75$, where the bulb meets the body, and move straight up. A point $0.1$ above it crosses the dashed circle after 33 steps. A point $0.01$ above it takes 315 steps, $0.001$ above takes 3143, and $0.0001$ above takes 31417. Closer points take longer, so no step limit catches every point.

Now multiply each count by its distance: $3.3$, $3.15$, $3.143$, $3.1417$. These answers seem to be heading for $\pi$.<sup><a id="mandelbrot-ref-3" href="#mandelbrot-source-3">3</a></sup>

Look at the round bulb on the left. Numbers inside it approach a two-number repeat, like the $0,-1$ example at its center. Numbers inside the heart-shaped body settle toward one value.<sup><a id="mandelbrot-ref-4" href="#mandelbrot-source-4">4</a></sup>

So far, every calculation has started at zero. Keep the number you add, but try a different starting point at every pixel. This makes a [Julia picture](/julia-set). A single choice in the Mandelbrot picture now gives us a whole new shape to explore.

<figure data-lesson="linked-julia"></figure>

## Further reading

- [Mandelbrot set — Wikipedia](https://en.wikipedia.org/wiki/Mandelbrot_set)
- [Mandelbrot set — MathWorld](https://mathworld.wolfram.com/MandelbrotSet.html)
- [The Mandelbrot Set — Mathigon](https://mathigon.org/course/fractals/mandelbrot)

## Sources and notes

1. <span id="mandelbrot-source-1"></span> [Introduction to Complex Dynamics](https://pi.math.cornell.edu/~lipa/mec/lesson5.html). [Back](#mandelbrot-ref-1)
2. <span id="mandelbrot-source-2"></span> Calculation: if $|z|>2$ and $|z|\ge|c|$, then $|z^2+c|\ge|z|^2-|c|\ge|z|(|z|-1)>|z|$. A crossing gives $|z|\ge|c|$: either $|c|\le2$, or the first jump lands on $c$. [Back](#mandelbrot-ref-2)
3. <span id="mandelbrot-source-3"></span> [Pi in the Mandelbrot set everywhere](https://arxiv.org/abs/2505.07138). Its proof follows curved paths into the neck. Along this straight line, the pattern has only been observed. [Back](#mandelbrot-ref-3)
4. <span id="mandelbrot-source-4"></span> [Local Connectivity of Julia Sets and Bifurcation Loci: Three Theorems of J.-C. Yoccoz](https://pi.math.cornell.edu/~hubbard/hubbard.pdf). [Back](#mandelbrot-ref-4)
