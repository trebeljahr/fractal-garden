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

Follow the two examples below, then choose another pixel. The ring stays on the number you chose. The amber point shows what happens when you keep squaring and adding it.

<figure data-orbit="mandelbrot"></figure>

A number belongs to the Mandelbrot set if its results stay within a fixed distance of zero forever. The computer cannot wait forever, so black means “hasn't escaped yet.” Other colors show how long escape took.

Look at the round bulb on the left. Numbers inside it approach a two-number repeat, like the $0,-1$ example at its center. Numbers inside the heart-shaped body settle toward one value.<sup><a id="mandelbrot-ref-2" href="#mandelbrot-source-2">2</a></sup>

So far, every calculation has started at zero. Keep the number you add, but try a different starting point at every pixel. This makes a [Julia picture](/julia-set). A single choice in the Mandelbrot picture now gives us a whole new shape to explore.

<figure data-lesson="linked-julia"></figure>

## Further reading

- [Mandelbrot set — Wikipedia](https://en.wikipedia.org/wiki/Mandelbrot_set)
- [The Mandelbrot Set — Mathigon](https://mathigon.org/course/fractals/mandelbrot)

## Sources and notes

1. <span id="mandelbrot-source-1"></span> [Introduction to Complex Dynamics](https://pi.math.cornell.edu/~lipa/mec/lesson5.html). [Back](#mandelbrot-ref-1)
2. <span id="mandelbrot-source-2"></span> [Local Connectivity of Julia Sets and Bifurcation Loci: Three Theorems of J.-C. Yoccoz](https://pi.math.cornell.edu/~hubbard/hubbard.pdf). [Back](#mandelbrot-ref-2)
