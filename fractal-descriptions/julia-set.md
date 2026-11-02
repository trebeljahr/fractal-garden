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

Every starting point in one picture uses the same $c$. Change it, and you change the whole picture.

<figure data-article-images="julia"></figure>

A starting point **escapes** if its distance from zero grows without limit. The edge of the dark shape is the **Julia set**. The whole dark shape, edge and inside together, is the **filled Julia set**: every starting point that never escapes. With $c=0$ the calculation is plain squaring again, so the Julia set is the circle and the filled Julia set is the solid disk it encloses.

The computer tests only a limited number of steps. Dark pixels haven't escaped yet; some may escape later.

Take $c = 0.2501$. From 100 steps to 300 steps, this picture barely changes: it shows a solid dark shape. Now move the slider to 320.

<figure data-lesson="step-limit-julia"></figure>

Most of the shape changes color between 310 and 330 steps. Every colored pixel has escaped, so the pale area is outside the filled Julia set. Its pixels look alike because they escape at about the same step. **Black and white** drops the colors, so only the pixels left over stay black.

Almost all of these points must pass close to $0.5$, and that takes about 300 steps. With $c = 0.25$, the point $0.5$ would never move: $0.5^2 + 0.25 = 0.5$. With $c = 0.2501$, it moves by only $0.0001$, so jumps near $0.5$ are very small. The point at the center of the picture spends 274 of its 315 steps within $0.05$ of $0.5$.

Some points land near $0.5$ again and repeat the slow trip. You can see more of them change color at about 650 and 1000 steps.

Which choices of $c$ keep the shape connected? The [Mandelbrot set](/mandelbrot) answers that question. Choose $c$ in the Mandelbrot set and the Julia set is connected. Choose it outside and the Julia set breaks into dust.<sup><a id="julia-set-ref-3" href="#julia-set-source-3">3</a></sup> The shape above is dust too: $c = 0.2501$ lies just outside.

The pictures below start on $c = -1$: a point starting at $0.5$ ends up jumping back and forth between $-1$ and $0$. Move the amber ring to $(0, 0)$ and you get the circle again. Move it outside the black shape and the Julia set breaks into dust.

<figure data-lesson="linked-julia"></figure>

## Where the orbits go

The route a point follows, jump after jump, is called its **orbit**. With the first demo's $c$, an orbit can do two things. It can escape, or it can fall into one repeating loop: $(0, 0)$, then $c$, then $(-0.66236, 0.56228)$, then $(0, 0)$ again. The point goes round that loop forever and never stops at any of the three places. This loop is called the **attractor**. The one exception is a point exactly on the edge of the dark shape, which stays on the edge forever.<sup><a id="julia-set-ref-4" href="#julia-set-source-4">4</a></sup>

The demo below colors each starting point by its turn on the loop. Points of one color reach the same place on the same jump, then move on together. Gray points escape. Play it and watch each color bunch together, join the loop and keep going round it until you pause.

<figure data-lesson="julia-attractor"></figure>

The dark shape is made of rounded pieces called lobes, and each lobe has one color. A jump moves a whole lobe onto another lobe, so its points stay together. After enough jumps, every lobe has landed on one of the three lobes that hold the loop's places.<sup><a id="julia-set-ref-5" href="#julia-set-source-4">4</a></sup>

The loop passes through $0$. Start at $0$ and you land on $c$, then on $(-0.66236, 0.56228)$, then back on $0$.<sup><a id="julia-set-ref-6" href="#julia-set-source-5">5</a></sup> Squaring makes small numbers much smaller: $0.1$ becomes $0.01$. So each time a point comes back near $0$, its distance from $0$ shrinks fast. A point $0.1$ from $0$ is $0.026$ away three jumps later, then $0.0018$, then $0.000009$. The gap keeps shrinking forever. After about 30 jumps it is too small for the computer to store, so the numbers repeat exactly.

Can the same $c$ have a second attractor? No. Pierre Fatou and Gaston Julia proved that if a $c$ has an attractor, $0$ falls into it.<sup><a id="julia-set-ref-7" href="#julia-set-source-4">4</a></sup> The point $0$ follows only one route, so it can fall into only one attractor. To find the attractor, start at $0$ and follow the jumps. That is the point the Mandelbrot test follows.

So the Mandelbrot picture shows how long the loop is. Drag the ring in the demo. Inside the heart-shaped body, the loop has one place, called a **fixed point**: one jump lands it on itself, so here the points do end up in one spot. Inside the round bulb on the left, it has two places: $c = -1$ sends $0$ to $-1$ and back. Inside the big bulbs above and below the heart, it has three.<sup><a id="julia-set-ref-8" href="#julia-set-source-6">6</a></sup> The numbers on the Mandelbrot picture mark more bulbs. Outside the black shape, $0$ escapes, there is no attractor and all the dots escape.

Count the colors that meet at a joint of the dark shape. For a bulb that touches the heart, that count is the number of places. The lines that meet at the main fork of the bulb's largest antenna give the same count.<sup><a id="julia-set-ref-9" href="#julia-set-source-6">6</a></sup>

Not every $c$ in the Mandelbrot set has an attractor. With $c = (0, 1)$, $0$ lands on a two-place loop that pushes nearby points away, and the Julia picture has no dark area.<sup><a id="julia-set-ref-10" href="#julia-set-source-4">4</a></sup> Close to a bulb's rim, the points need far more jumps, and the demo may not find the attractor.

## Further reading
- [Julia set — Wikipedia](https://en.wikipedia.org/wiki/Julia_set)
- [Julia set — MathWorld](https://mathworld.wolfram.com/JuliaSet.html)
- [Understanding Julia and Mandelbrot Sets — Karl Sims](https://www.karlsims.com/julia.html)
- [How to Fold a Julia Fractal — Steven Wittens](https://acko.net/blog/how-to-fold-a-julia-fractal/)
- [The Julia Set — Complex Analysis](https://complex-analysis.com/content/julia_set.html)
- [Beyond the Mandelbrot set, an intro to holomorphic dynamics — 3Blue1Brown](https://www.youtube.com/watch?v=LqbZpur38nw)
- [Julia Set in Processing — The Coding Train](https://www.youtube.com/watch?v=fAsaSkmbF5s)

## Sources and notes

1. <span id="julia-set-source-1"></span> [Introduction to Complex Dynamics](https://pi.math.cornell.edu/~lipa/mec/lesson5.html). [Back](#julia-set-ref-1)
2. <span id="julia-set-source-2"></span> Calculation: if $|z|>2$ and $|z|\ge|c|$, then $|z^2+c|\ge|z|^2-|c|\ge|z|(|z|-1)>|z|$. Here $|c|\approx0.75$. [Back](#julia-set-ref-2)
3. <span id="julia-set-source-3"></span> [Local Connectivity of Julia Sets and Bifurcation Loci: Three Theorems of J.-C. Yoccoz](https://pi.math.cornell.edu/~hubbard/hubbard.pdf). [Back](#julia-set-ref-3)
4. <span id="julia-set-source-4"></span> [Dynamics in One Complex Variable: Introductory Lectures](https://arxiv.org/abs/math/9201272). Lemma 14.2 covers the two futures and the lobes, Lemma 3.1 the edge, Lemmas 10.2 and 10.4 and Remark 10.5 the attractor and $0$, and Figure 1c the case $c = (0, 1)$. [Back](#julia-set-ref-4) [Back](#julia-set-ref-5) [Back](#julia-set-ref-7) [Back](#julia-set-ref-10)
5. <span id="julia-set-source-5"></span> Calculation: this $c$ is rounded to five decimals, so the third jump lands about $0.000004$ from $0$, and the attractor's place sits that close to $0$. Distances are measured from that place. [Back](#julia-set-ref-6)
6. <span id="julia-set-source-6"></span> [Rotation Numbers and Internal Angles of the Mandelbrot Bulbs](https://math.libretexts.org/Bookshelves/Scientific_Computing_Simulations_and_Modeling/The_Mandelbrot_and_Julia_sets_Anatomy_(Demidov)/1%3A_Quick_tour/1.1%3A_Rotation_Numbers_and_Internal_angles_of_the_Mandelbrot_bulbs). [Back](#julia-set-ref-8) [Back](#julia-set-ref-9)
