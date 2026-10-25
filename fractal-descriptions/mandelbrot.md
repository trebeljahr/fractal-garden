# Mandelbrot Set

Choose a number to add. Start at zero, square the current result, add your chosen number, and do it again.

If you choose $1$, the results are:

$$
0\to1\to2\to5\to26\to\cdots
$$

The results increase without limit. Choose $-1$ instead and you get $0,-1,0,-1,\ldots$. It repeats forever without growing.

<figure data-article-images="mandelbrot"></figure>

The Mandelbrot picture applies this test to complex numbers. A complex number has two coordinates, which lets us place each choice on the screen. Each pixel's coordinates supply a different number to add.

A choice belongs to the Mandelbrot set if its results stay within some fixed distance of zero, however many steps are taken. The computer repeats the calculation a limited number of times. If the results escape, it colors the pixel by how long that took. If they haven't escaped yet, it leaves the pixel black.

The calculation is usually written as $z_{n+1}=z_n^2+c$. Here $c$ is the number that pixel chooses, and $z_n$ is the current result.

<figure data-orbit="mandelbrot"></figure>

The round bulb to the left of the main body contains choices that settle toward a two-value repeat. At its center, $c=-1$ gives the exact $0,-1$ repeat above. Inside the heart-shaped body, the results instead settle toward one value.<sup><a id="mandelbrot-ref-1" href="#mandelbrot-source-1">1</a></sup>

The [Julia explorer](/julia-set) changes the test: every pixel uses the same number to add, but starts from a different position. That is why choosing a new $c$ there changes the whole picture.

## Further reading

- [Mandelbrot set — Wikipedia](https://en.wikipedia.org/wiki/Mandelbrot_set)
- [The Mandelbrot Set — Mathigon](https://mathigon.org/course/fractals/mandelbrot)

## Sources and notes

1. <span id="mandelbrot-source-1"></span> John H. Hubbard, [Local Connectivity of Julia Sets and Bifurcation Loci: Three Theorems of J.-C. Yoccoz](https://pi.math.cornell.edu/~hubbard/hubbard.pdf), *Topological Methods in Modern Mathematics* (1993), especially section 5 on the main cardioid and limbs. The two-cycle at $-1$ follows by substitution. [Back](#mandelbrot-ref-1)
