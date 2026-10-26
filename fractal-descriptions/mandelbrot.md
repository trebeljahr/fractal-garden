# Mandelbrot Set

Choose a number to add. Start at zero, square the current result, add your chosen number, and do it again.

If you choose $1$, the results are:

$$
0\to1\to2\to5\to26\to\cdots
$$

The results increase without limit. Choose $-1$ instead and you get $0,-1,0,-1,\ldots$. It repeats forever without growing.

<figure data-article-images="mandelbrot"></figure>

To make a picture, give each pixel two coordinates: horizontal and vertical. A pair such as $(1,0)$ means one unit right of zero. These pairs represent **complex numbers**. Each pixel supplies a different number to add, called $c$.

Squaring changes a point's distance and direction. Multiply its distance from zero by itself, and double its angle measured from the line pointing right. Adding $c$ then shifts it horizontally and vertically by the chosen coordinates.<sup><a id="mandelbrot-ref-1" href="#mandelbrot-source-1">1</a></sup>

The small image below lets you choose a pixel and follow its calculation. Compare **Repeating** and **Escaping**, using the two numbers above. The ring marks the chosen pixel. The moving point shows the results used to decide that pixel's color.

<figure data-orbit="mandelbrot"></figure>

A choice belongs to the Mandelbrot set if its results stay within a fixed distance of zero forever. The computer can only test a limited number of steps. Escaping results give the chosen pixel a color based on how long escape took. Black means it hasn't escaped yet.

The round bulb left of the main body contains choices that settle toward a two-value repeat. At its center, $c=-1$ gives the exact $0,-1$ repeat above. Inside the heart-shaped body, the results settle toward one value.<sup><a id="mandelbrot-ref-2" href="#mandelbrot-source-2">2</a></sup>

The [Julia explorer](/julia-set) changes the test: every pixel uses the same number to add, but starts from a different position. That is why choosing a new $c$ there changes the whole picture.

## Further reading

- [Mandelbrot set — Wikipedia](https://en.wikipedia.org/wiki/Mandelbrot_set)
- [The Mandelbrot Set — Mathigon](https://mathigon.org/course/fractals/mandelbrot)

## Sources and notes

1. <span id="mandelbrot-source-1"></span> [Introduction to Complex Dynamics](https://pi.math.cornell.edu/~lipa/mec/lesson5.html). [Back](#mandelbrot-ref-1)
2. <span id="mandelbrot-source-2"></span> [Local Connectivity of Julia Sets and Bifurcation Loci: Three Theorems of J.-C. Yoccoz](https://pi.math.cornell.edu/~hubbard/hubbard.pdf). [Back](#mandelbrot-ref-2)
