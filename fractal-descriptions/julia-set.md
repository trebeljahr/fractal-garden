# Julia Set

Start with $0.5$ and keep squaring it. You get $0.25$, then $0.0625$, then smaller and smaller numbers. Start with $2$ instead: $4$, $16$, $256$. The answers grow.

We can do the same with points on a plane. A point has a horizontal and a vertical coordinate; together they form a **complex number**. To square it, multiply its distance from zero by itself and double its angle from the line pointing right.

Points less than one unit from zero move closer with every squaring. Points farther than one unit move away. The circle between them is the simplest Julia set.<sup><a id="julia-set-ref-1" href="#julia-set-source-1">1</a></sup>

Now start at a pixel's position, $z_0$. Square it and add a number called $c$ to get $z_1$. Do that again to $z_1$, with the same $c$, to get $z_2$, and keep going:

$$
z_{n+1} = z_n^2 + c
$$

In coordinates, if the current point is $(x, y)$ and $c$ is $(a, b)$, the next point is:

$$
(x^2 - y^2 + a,\ 2xy + b)
$$

With $c=(-0.12256, 0.74486)$, the circle becomes the dark shape below. Pick a pixel in the dark shape and the point ends up jumping around the same three places. Pick a pixel outside it and the point ends up crossing the dashed circle, two units from zero. After that, every jump takes it farther away.<sup><a id="julia-set-ref-2" href="#julia-set-source-2">2</a></sup>

<figure data-orbit="julia"></figure>

Every starting point in one picture uses the same $c$. Change it, and you change the whole picture.

<figure data-article-images="julia"></figure>

Starting points whose results stay within a fixed distance of zero forever make up the **filled Julia set**. Its edge is the **Julia set**. For $c=0$, these are a filled disk and its circular edge.

The computer tests only a limited number of steps. Dark pixels haven't escaped yet; some may escape later.

Take $c = 0.2501$. From 100 steps to 300 steps, this picture barely changes: it shows a solid dark shape. Now move the slider to 320.

<figure data-lesson="step-limit-julia"></figure>

Most of the shape changes color between 310 and 330 steps. Every colored pixel has escaped, so the pale area is outside the filled Julia set. Its pixels look alike because they escape at about the same step. **Black and white** drops the colors, so only the pixels left over stay black.

Almost all of these points must pass close to $0.5$, and that takes about 300 steps. With $c = 0.25$, the point $0.5$ would never move: $0.5^2 + 0.25 = 0.5$. With $c = 0.2501$, it moves by only $0.0001$, so jumps near $0.5$ are very small. The point at the center of the picture spends 274 of its 315 steps within $0.05$ of $0.5$.

Some points land near $0.5$ again and repeat the slow trip. You can see more of them change color at about 650 and 1000 steps.

Which choices of $c$ keep the shape connected? The [Mandelbrot set](/mandelbrot) answers that question. Choose $c$ in the Mandelbrot set and the Julia set is connected. Choose it outside and the Julia set breaks into dust.<sup><a id="julia-set-ref-3" href="#julia-set-source-3">3</a></sup> The shape above is dust too: $c = 0.2501$ lies just outside.

The pictures below start on $c = -1$: a point starting at $0.5$ ends up jumping back and forth between $-1$ and $0$. Move the amber ring to $(0, 0)$ and you get the circle again. Move it outside the black shape and the Julia set breaks into dust.

<figure data-lesson="linked-julia"></figure>

## How a pixel gets its color

The computer repeats the calculation until the point is more than 256 units from zero, or until it has done 200 calculations. A pixel that reaches the limit is drawn dark. Some explorer views raise the limit.

Every other pixel is colored by how many calculations it needed. Call that count $n$. Pixels near the shape need more.

Using $n$ directly would draw flat stripes, because neighboring pixels can differ by a whole calculation. So the color uses a number that also depends on how far past 256 the point landed:<sup><a id="julia-set-ref-4" href="#julia-set-source-4">4</a></sup>

$$
\nu = n - \log_2 \ln |z_n|
$$

Here $|z_n|$ is the point's distance from zero after the last calculation. $\ln$ is the natural logarithm, which doubles when its input is squared. $\log_2$ counts doublings, so it goes up by 1 when its input doubles.

Take two neighboring pixels. One passes 256 after $n$ calculations. The other lands just short, so it needs one more calculation, and that squares its distance to about $256^2$. Its count is 1 higher, and its $\log_2 \ln$ term is also about 1 higher. The subtraction removes that difference, so the two pixels get nearly the same $\nu$.

This needs the point to be far from zero, where adding $c$ hardly changes its distance. That is why the picture uses 256 instead of the 2 in the first demo.

Last, $\nu$ sets the color. As $\nu$ rises, the color goes from dark blue through light blue, white, orange and dark red, then back to dark blue. One round takes about 89 counts.<sup><a id="julia-set-ref-5" href="#julia-set-source-5">5</a></sup> Pixels far from the shape are dark blue. Pixels near its edge turn white and orange.

## Further reading

- [Julia set — Wikipedia](https://en.wikipedia.org/wiki/Julia_set)
- [Julia set — MathWorld](https://mathworld.wolfram.com/JuliaSet.html)
- [Gaston Julia — MacTutor](https://mathshistory.st-andrews.ac.uk/Biographies/Julia/)

## Sources and notes

1. <span id="julia-set-source-1"></span> [Introduction to Complex Dynamics](https://pi.math.cornell.edu/~lipa/mec/lesson5.html). [Back](#julia-set-ref-1)
2. <span id="julia-set-source-2"></span> Calculation: if $|z|>2$ and $|z|\ge|c|$, then $|z^2+c|\ge|z|^2-|c|\ge|z|(|z|-1)>|z|$. Here $|c|\approx0.75$. [Back](#julia-set-ref-2)
3. <span id="julia-set-source-3"></span> [Local Connectivity of Julia Sets and Bifurcation Loci: Three Theorems of J.-C. Yoccoz](https://pi.math.cornell.edu/~hubbard/hubbard.pdf). [Back](#julia-set-ref-3)
4. <span id="julia-set-source-4"></span> [Renormalizing the Mandelbrot Escape](https://linas.org/art-gallery/escape/escape.html). [Back](#julia-set-ref-4)
5. <span id="julia-set-source-5"></span> Calculation, using the explorer's opening color settings. Red, green and blue each equal $\tfrac12 + \tfrac12\cos(2\pi(t + d))$, with $t = 0.45\,\nu/40 + 0.45$ and $d = 0,\ 0.1,\ 0.2$. The colors repeat when $t$ rises by 1, which takes $40/0.45 \approx 89$ counts. [Back](#julia-set-ref-5)
