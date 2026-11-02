# Julia Set

Start with $0.5$ and keep squaring it. You get $0.25$, then $0.0625$, then smaller and smaller numbers. Start with $2$ instead: $4$, $16$, $256$. The answers grow.

We can do the same with points on a plane. A point has a horizontal and a vertical coordinate; together they form a **complex number**. To square it, multiply its distance from zero by itself and double its angle from the line pointing right.

Points less than one unit from zero move closer with every squaring. Points farther than one unit move away. The circle between them is the simplest Julia set.<sup><a id="julia-set-ref-1" href="#julia-set-source-1">1</a></sup>

Try a point inside the circle, then one outside. Next, choose **Add −1**. Subtracting one after every square changes the circle into a different shape.

<figure data-orbit="julia"></figure>

The number added each time is called $c$. Every starting point in one picture uses the same $c$. Change it, and you change the whole picture.

<figure data-article-images="julia"></figure>

Here is the calculation for one pixel. The pixel's position is the first point, $z_0$. Square it and add $c$ to get $z_1$. Do the same to $z_1$ to get $z_2$, and keep going:

$$
z_{n+1} = z_n^2 + c
$$

This is the same squaring as before, written in coordinates. If the current point is $(x, y)$ and $c$ is $(a, b)$, the next point is:

$$
(x^2 - y^2 + a,\ 2xy + b)
$$

Starting points whose results stay within a fixed distance of zero forever make up the **filled Julia set**. Its edge is the **Julia set**. For $c=0$, these are a filled disk and its circular edge.

The computer tests only a limited number of steps. Dark pixels haven't escaped yet; some may escape later.

Which choices of $c$ keep the shape connected? The [Mandelbrot set](/mandelbrot) answers that question. Choose $c$ in the Mandelbrot set and the Julia set is connected. Choose it outside and the Julia set breaks into dust.<sup><a id="julia-set-ref-2" href="#julia-set-source-2">2</a></sup>

Try **Circle**, **Two lobes**, then **Dust** below. Watch where the amber ring sits in the Mandelbrot picture as the Julia shape changes.

<figure data-lesson="linked-julia"></figure>

## How a pixel gets its color

The computer repeats the calculation until the point is more than 256 units from zero, or until it has done 200 calculations. A pixel that reaches the limit is drawn dark. Some explorer views raise the limit.

Every other pixel is colored by how many calculations it needed. Call that count $n$. Pixels near the shape need more.

Using $n$ directly would draw flat stripes, because neighboring pixels can differ by a whole calculation. So the color uses a number that also depends on how far past 256 the point landed:<sup><a id="julia-set-ref-3" href="#julia-set-source-3">3</a></sup>

$$
\nu = n - \log_2 \ln |z_n|
$$

Here $|z_n|$ is the point's distance from zero after the last calculation. $\ln$ is the natural logarithm, which doubles when its input is squared. $\log_2$ counts doublings, so it goes up by 1 when its input doubles.

Take two neighboring pixels. One passes 256 after $n$ calculations. The other lands just short, so it needs one more calculation, and that squares its distance to about $256^2$. Its count is 1 higher, and its $\log_2 \ln$ term is also about 1 higher. The subtraction removes that difference, so the two pixels get nearly the same $\nu$.

This needs the point to be far from zero, where adding $c$ hardly changes its distance. That is why the picture uses 256 instead of the 4 in the first demo.

Last, $\nu$ sets the color. As $\nu$ rises, the color goes from dark blue through light blue, white, orange and dark red, then back to dark blue. One round takes about 89 counts.<sup><a id="julia-set-ref-4" href="#julia-set-source-4">4</a></sup> Pixels far from the shape are dark blue. Pixels near its edge turn white and orange.

## Further reading

- [Julia set — Wikipedia](https://en.wikipedia.org/wiki/Julia_set)
- [Introduction to Complex Dynamics — Cornell Math Explorers’ Club](https://pi.math.cornell.edu/~lipa/mec/lesson5.html)

## Sources and notes

1. <span id="julia-set-source-1"></span> [Introduction to Complex Dynamics](https://pi.math.cornell.edu/~lipa/mec/lesson5.html). [Back](#julia-set-ref-1)
2. <span id="julia-set-source-2"></span> [Local Connectivity of Julia Sets and Bifurcation Loci: Three Theorems of J.-C. Yoccoz](https://pi.math.cornell.edu/~hubbard/hubbard.pdf). [Back](#julia-set-ref-2)
3. <span id="julia-set-source-3"></span> [Renormalizing the Mandelbrot Escape](https://linas.org/art-gallery/escape/escape.html). [Back](#julia-set-ref-3)
4. <span id="julia-set-source-4"></span> Calculation, using the explorer's opening color settings. Red, green and blue each equal $\tfrac12 + \tfrac12\cos(2\pi(t + d))$, with $t = 0.45\,\nu/40 + 0.45$ and $d = 0,\ 0.1,\ 0.2$. The colors repeat when $t$ rises by 1, which takes $40/0.45 \approx 89$ counts. [Back](#julia-set-ref-4)
