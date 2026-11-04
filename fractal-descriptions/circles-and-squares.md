# Circles and Squares

Lay a grid of dots over the plane, with a fixed step between neighbors. For each dot, compute $x^2 + y^2$ and drop the fraction, then paint the dot light if the whole number is even and dark if it is odd. John Connett found this picture by accident, while working on a program to draw the [Mandelbrot set](/mandelbrot).<sup><a id="circles-and-squares-ref-1" href="#circles-and-squares-source-1">1</a></sup>

Points at the same distance from the center get the same value, so the rule draws one set of rings around one center, and when the dots are close together that is what you see. Spread the dots apart by raising the step between them.

<figure data-lesson="circle-ghosts"></figure>

More centers appear, in rows, each with its own rings, even though the formula has only one center. All the others are ghosts.

Rings get thinner as they go outward, and eventually they are thinner than the gaps between dots, so a row of dots skips over whole rings. At certain distances it skips exactly one ring per dot, or two, or any whole number, which puts each dot at the same place in its ring as its neighbor. That row looks as if it has stopped moving outward at all, and to the eye that is a center.

You can check this with the numbers. "Even or odd" is the same as keeping the remainder after dividing by $m = 2$. With a step of $s$, moving $n$ dots along a row adds $2nsx$ to $x^2 + y^2$, plus a constant. Dots sit at multiples of $s$, so when $n = m/(2s^2)$ is a whole number, this added amount is a whole multiple of $m$, and the remainder ignores it. The rings around that dot are then an exact copy of the rings around the true center, except that light and dark swap when $n$ is odd. Most steps don't make $n$ a whole number, so the nearest dot gives a close copy instead.<sup><a id="circles-and-squares-ref-2" href="#circles-and-squares-source-2">2</a></sup>

The close-up at a ghost center shows this directly: there is one full ring between neighboring dots, so every dot in that row lands at the same place in its ring.

The result is a moiré pattern, like the shimmer of two overlapping window screens, and it belongs to the dots rather than to the rings. MathWorld lists it among fractals, but it does not contain smaller and smaller copies of itself, because if you zoom in far enough you only see the rings.<sup><a id="circles-and-squares-ref-3" href="#circles-and-squares-source-1">1</a></sup>

MathWorld writes the rule as $z_{n+1} = z_n^2 \pmod m$.<sup><a id="circles-and-squares-ref-4" href="#circles-and-squares-source-3">3</a></sup> This page reads that as $z_1 = x^2 + y^2$, with $m = 2$ by default. **Squarings** in the controls repeats the square-and-remainder step, which folds each ring into many.

## Further exploring

- [Circle Squares fractal — Paul Bourke](https://paulbourke.net/fractals/circlesquares/)

## Sources and notes

1. <span id="circles-and-squares-source-1"></span> [Aliasing Artifacts and Accidental Algorithmic Art](https://archive.bridgesmathart.org/2005/bridges2005-349.pdf), §3, on A. K. Dewdney's 1986 column about Connett's program. It also notes that the pattern is not technically a fractal. [Back](#circles-and-squares-ref-1) [Back](#circles-and-squares-ref-3)
2. <span id="circles-and-squares-source-2"></span> Calculation. With $k = s^2/m$, a dot at grid position $(i, j)$ has value $k(i^2 + j^2)$. Moving by $n$ dots gives $k(i+n)^2 = ki^2 + 2kni + kn^2$. The article's $n$ makes $2kn = 1$, so $2kni$ is a whole number and only the constant $kn^2 = n/2$ remains. That is half a cycle when $n$ is odd, which swaps light and dark. [Back](#circles-and-squares-ref-2)
3. <span id="circles-and-squares-source-3"></span> [Circles-and-Squares Fractal](https://mathworld.wolfram.com/Circles-and-SquaresFractal.html). [Back](#circles-and-squares-ref-4)
