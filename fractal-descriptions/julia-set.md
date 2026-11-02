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

The demo below uses $c=(-0.12256, 0.74486)$. Each new $z$ is one jump.

Points still split into two groups, but the line between them is no longer a circle. It is the edge of the dark shape. Pick a pixel outside it and the point ends up crossing the dashed circle, two units from zero. After that, every jump takes it farther away.<sup><a id="julia-set-ref-2" href="#julia-set-source-2">2</a></sup>

Pick a pixel in the dark shape and the point ends up jumping around three places. Now pick a different pixel in the dark shape. It ends up on the same three places.

<figure data-orbit="julia"></figure>

Under the picture, the current jump is worked out by hand and rounded to five decimals. Press **Next jump** and the new point goes back in as the next starting point.

Here are 1920 starting points spread across the picture, one dot each. All the dots jump together. The rings mark the three places: $(0, 0)$, $c$ and $(-0.66236, 0.56228)$.

<figure data-lesson="julia-swarm"></figure>

Dots outside the dark shape leave the picture. Dots inside it all end up on the rings. Dots near the edge take longest.

Why the same three? Start at $0$ and jump. You land on $c$, then on $(-0.66236, 0.56228)$, then back on $0$.<sup><a id="julia-set-ref-3" href="#julia-set-source-3">3</a></sup> So the loop goes through $0$.

Squaring makes small numbers much smaller: $0.1$ becomes $0.01$. So each time a point comes back near $0$, its distance from $0$ shrinks fast. A point $0.1$ from $0$ is $0.026$ away three jumps later, then $0.0018$, then $0.000009$.

A point far from the rings gets there in stages. The dark shape is made of rounded pieces called lobes, and a jump moves a whole lobe onto another lobe. After enough jumps, every lobe has landed on one of the three lobes that hold the rings, and points in those lobes end up near the rings.<sup><a id="julia-set-ref-4" href="#julia-set-source-4">4</a></sup>

The one exception is the edge. A point exactly on the edge stays on the edge forever.<sup><a id="julia-set-ref-5" href="#julia-set-source-4">4</a></sup> It never reaches the rings and it never leaves. One such point is $(-0.27634, 0.47973)$, where three lobes meet: one jump lands it on itself. Move it a little and it ends up on the rings or leaves.

Can the same $c$ have a second loop like this? No. Call a loop **attracting** if points near it end up on it. Pierre Fatou and Gaston Julia proved that $0$ always ends up on an attracting loop.<sup><a id="julia-set-ref-6" href="#julia-set-source-4">4</a></sup> The point $0$ follows only one route, so one $c$ can have only one attracting loop. To find it, start at $0$ and follow the jumps.

Every starting point in one picture uses the same $c$. Change it, and you change the whole picture.

<figure data-article-images="julia"></figure>

A starting point **escapes** if its distance from zero grows without limit. The starting points that never escape make up the **filled Julia set**, the dark shape. Its edge is the **Julia set**. With $c=0$ the calculation is plain squaring again, so the filled Julia set is a solid disk and the Julia set is the circle around it.

The computer tests only a limited number of steps. Dark pixels haven't escaped yet; some may escape later.

Take $c = 0.2501$. From 100 steps to 300 steps, this picture barely changes: it shows a solid dark shape. Now move the slider to 320.

<figure data-lesson="step-limit-julia"></figure>

Most of the shape changes color between 310 and 330 steps. Every colored pixel has escaped, so the pale area is outside the filled Julia set. Its pixels look alike because they escape at about the same step. **Black and white** drops the colors, so only the pixels left over stay black.

Almost all of these points must pass close to $0.5$, and that takes about 300 steps. With $c = 0.25$, the point $0.5$ would never move: $0.5^2 + 0.25 = 0.5$. With $c = 0.2501$, it moves by only $0.0001$, so jumps near $0.5$ are very small. The point at the center of the picture spends 274 of its 315 steps within $0.05$ of $0.5$.

Some points land near $0.5$ again and repeat the slow trip. You can see more of them change color at about 650 and 1000 steps.

Which choices of $c$ keep the shape connected? The [Mandelbrot set](/mandelbrot) answers that question. Choose $c$ in the Mandelbrot set and the Julia set is connected. Choose it outside and the Julia set breaks into dust.<sup><a id="julia-set-ref-7" href="#julia-set-source-5">5</a></sup> The shape above is dust too: $c = 0.2501$ lies just outside.

The Mandelbrot test starts every calculation at $0$, the point that finds the loop. So each part of the Mandelbrot set has its own loop length.

Inside the heart-shaped body, the loop has one place. One jump lands that place on itself, so it is called a **fixed point**. Inside the round bulb on the left, the loop has two places: $c = -1$ sends $0$ to $-1$ and back. Inside the big bulbs above and below the heart, it has three, and the first picture's $c$ is the center of the top one.<sup><a id="julia-set-ref-8" href="#julia-set-source-6">6</a></sup> The numbers in the Mandelbrot picture mark more bulbs.

Drag the ring in the Mandelbrot picture. The rings in the Julia picture and the count show the loop you get by following $0$. Let go and the dots start again from across the picture. Move the ring to $(0, 0)$ and you get the circle from the start of this article, where every point inside ends up on $0$. Move it outside the black shape and all the dots leave.

<figure data-lesson="julia-loops"></figure>

You can read the number off either picture. Take a bulb that touches the heart. Count the lines that meet at the main fork of its largest antenna. Then, in its Julia picture, count the lobes that meet at each joint. Both counts give the length of the loop.<sup><a id="julia-set-ref-9" href="#julia-set-source-6">6</a></sup>

Close to a bulb's rim the dots need far more jumps, and the count may not find the loop.

Not every $c$ in the Mandelbrot set has an attracting loop. With $c = (0, 1)$, $0$ lands on a two-place loop that pushes nearby points away, and the Julia picture has no dark area.<sup><a id="julia-set-ref-10" href="#julia-set-source-4">4</a></sup>

## How a pixel gets its color

The computer repeats the calculation until the point is more than 256 units from zero, or until it has done 200 calculations. A pixel that reaches the limit is drawn dark. Some explorer views raise the limit.

Every other pixel is colored by how many calculations it needed. Call that count $n$. Pixels near the shape need more.

Using $n$ directly would draw flat stripes, because neighboring pixels can differ by a whole calculation. So the color uses a number that also depends on how far past 256 the point landed:<sup><a id="julia-set-ref-11" href="#julia-set-source-7">7</a></sup>

$$
\nu = n - \log_2 \ln |z_n|
$$

Here $|z_n|$ is the point's distance from zero after the last calculation. $\ln$ is the natural logarithm, which doubles when its input is squared. $\log_2$ counts doublings, so it goes up by 1 when its input doubles.

Take two neighboring pixels. One passes 256 after $n$ calculations. The other lands just short, so it needs one more calculation, and that squares its distance to about $256^2$. Its count is 1 higher, and its $\log_2 \ln$ term is also about 1 higher. The subtraction removes that difference, so the two pixels get nearly the same $\nu$.

This needs the point to be far from zero, where adding $c$ hardly changes its distance. That is why the picture uses 256 instead of the 2 in the first demo.

Last, $\nu$ sets the color. As $\nu$ rises, the color goes from dark blue through light blue, white, orange and dark red, then back to dark blue. One round takes about 89 counts.<sup><a id="julia-set-ref-12" href="#julia-set-source-8">8</a></sup> Pixels far from the shape are dark blue. Pixels near its edge turn white and orange.

## Further reading

- [Julia set — Wikipedia](https://en.wikipedia.org/wiki/Julia_set)
- [Julia set — MathWorld](https://mathworld.wolfram.com/JuliaSet.html)
- [Gaston Julia — MacTutor](https://mathshistory.st-andrews.ac.uk/Biographies/Julia/)
- [Understanding Julia and Mandelbrot Sets — Karl Sims](https://www.karlsims.com/julia.html)
- [The Julia Set — Complex Analysis](https://complex-analysis.com/content/julia_set.html)
- [Julia Set Fractal — Paul Bourke](https://paulbourke.net/fractals/juliaset/)
- [A History of Fractal Geometry — MacTutor](https://mathshistory.st-andrews.ac.uk/HistTopics/fractals/)
- [How a Mandelbrot set arises from Newton’s work — 3Blue1Brown](https://www.3blue1brown.com/lessons/holomorphic-dynamics)
- [What’s so special about the Mandelbrot Set? — Numberphile](https://www.youtube.com/watch?v=FFftmWSzgmk)
- [Computing the Distance to a Julia Set — Inigo Quilez](https://iquilezles.org/articles/distancefractals/)
- [Julia Set — The Coding Train](https://thecodingtrain.com/challenges/22-julia-set)
- [The Mandelbrot Set — Mathigon](https://mathigon.org/course/fractals/mandelbrot)

## Sources and notes

1. <span id="julia-set-source-1"></span> [Introduction to Complex Dynamics](https://pi.math.cornell.edu/~lipa/mec/lesson5.html). [Back](#julia-set-ref-1)
2. <span id="julia-set-source-2"></span> Calculation: if $|z|>2$ and $|z|\ge|c|$, then $|z^2+c|\ge|z|^2-|c|\ge|z|(|z|-1)>|z|$. Here $|c|\approx0.75$. [Back](#julia-set-ref-2)
3. <span id="julia-set-source-3"></span> Calculation: this $c$ is rounded to five decimals, so the third jump lands about $0.000004$ from $0$, and the loop's place sits that close to $0$. Distances are measured from that place. [Back](#julia-set-ref-3)
4. <span id="julia-set-source-4"></span> [Dynamics in One Complex Variable: Introductory Lectures](https://arxiv.org/abs/math/9201272). Lemmas 10.2 and 10.4 and Remark 10.5 cover the loop and $0$, Lemma 14.2 the lobes, Lemma 3.1 the edge, and Figure 1c the case $c = (0, 1)$. [Back](#julia-set-ref-4) [Back](#julia-set-ref-5) [Back](#julia-set-ref-6) [Back](#julia-set-ref-10)
5. <span id="julia-set-source-5"></span> [Local Connectivity of Julia Sets and Bifurcation Loci: Three Theorems of J.-C. Yoccoz](https://pi.math.cornell.edu/~hubbard/hubbard.pdf). [Back](#julia-set-ref-7)
6. <span id="julia-set-source-6"></span> [Rotation Numbers and Internal Angles of the Mandelbrot Bulbs](https://math.libretexts.org/Bookshelves/Scientific_Computing_Simulations_and_Modeling/The_Mandelbrot_and_Julia_sets_Anatomy_(Demidov)/1%3A_Quick_tour/1.1%3A_Rotation_Numbers_and_Internal_angles_of_the_Mandelbrot_bulbs). [Back](#julia-set-ref-8) [Back](#julia-set-ref-9)
7. <span id="julia-set-source-7"></span> [Renormalizing the Mandelbrot Escape](https://linas.org/art-gallery/escape/escape.html). [Back](#julia-set-ref-11)
8. <span id="julia-set-source-8"></span> Calculation, using the explorer's opening color settings. Red, green and blue each equal $\tfrac12 + \tfrac12\cos(2\pi(t + d))$, with $t = 0.45\,\nu/40 + 0.45$ and $d = 0,\ 0.1,\ 0.2$. The colors repeat when $t$ rises by 1, which takes $40/0.45 \approx 89$ counts. [Back](#julia-set-ref-12)
