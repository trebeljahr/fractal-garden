# Julia Set

If you start with $0.5$ and keep squaring, you get $0.25$, then $0.0625$, and the numbers keep shrinking toward zero. If you start with $2$, you get $4$, $16$, $256$, and they grow without limit. You can drag the ring along the line to try other numbers.

<figure data-lesson="square-line"></figure>

Everything between $-1$ and $1$ gets drawn in toward $0$, and everything outside grows without limit. The switch is abrupt: $0.99$ heads to $0$, while $1.01$ flies off forever.

We can ask the same question about points on a plane. A point has a horizontal and a vertical coordinate, and together they form a **complex number**. To square one, you multiply its distance from zero by itself and double its angle from the line pointing right.

As you drag the ring below, the line joins the point to its square, then to the square of that, and so on. We call each step a jump and the whole path the point's **orbit**, and the chart shows the point's distance from zero after each jump.

<figure data-lesson="orbits-squaring"></figure>

Inside the circle, every orbit heads toward $0$. Outside, the distance from zero grows without limit, and we say the point **escapes**. Close to the circle, the orbit takes longer to go either way, because $1.001$ squared is only about $1.002$. So the circle is the boundary between two groups of points, and that boundary is the simplest Julia set.<sup><a id="julia-set-ref-1" href="#julia-set-source-1">1</a></sup>

One small change to the rule makes this much more interesting. Start at a point, $z_0$, then square it and add a fixed number $c$ to get $z_1$. Do the same to $z_1$, with the same $c$, to get $z_2$, and keep going:

$$
z_{n+1} = z_n^2 + c
$$

In coordinates, if the current point is $(x, y)$ and $c$ is $(a, b)$, the next point is:

$$
(x^2 - y^2 + a,\ 2xy + b)
$$

In the demo below, the ring is the starting point and the $c$ dot is the number you add, which starts at about $(-0.12, 0.74)$.

The old circle no longer separates the two groups. If you drag the ring to $(0.45, 0.05)$, it starts inside the circle and escapes, and at $(1.1, -0.6)$, it starts outside the circle and stays. Points still split into two groups, but you can't tell where the boundary is yet. See if you can find it by dragging the ring around, and then turn on **Show the edge**.

<figure data-lesson="orbits-adding"></figure>

That edge is the **Julia set** for this $c$. If you drag the $c$ dot onto $0$, the rule is plain squaring again and the edge is the circle. As you drag $c$ away slowly, the circle at first only bends, then farther out it can pinch, and far enough out it breaks into dust. The buttons move $c$ to a few well-known shapes.

The next demo uses $c=(-0.12256, 0.74486)$. The dark shape is every point that stays, with the Julia set as its edge. If you pick a pixel outside it, the point eventually crosses the dashed circle, two units from zero, and after that every jump takes it farther away.<sup><a id="julia-set-ref-2" href="#julia-set-source-2">2</a></sup>

If you pick a pixel in the dark shape, the point ends up jumping around three places. A different pixel in the dark shape ends up on the same three places, which is something we'll come back to.

<figure data-orbit="julia"></figure>

Under the picture, the current jump is worked out by hand and rounded to five decimals, and **Next jump** feeds the new point back in as the next starting point.

You saw the edge break into dust as $c$ moved, so it's natural to ask which values of $c$ keep it in one piece. That's what the [Mandelbrot set](/mandelbrot) tells you. If you choose $c$ in the Mandelbrot set, the Julia set is connected, and if you choose it outside, the Julia set breaks into dust.<sup><a id="julia-set-ref-3" href="#julia-set-source-3">3</a></sup>

In the demo below, each point of the left picture is one value of $c$. To choose its color, the demo starts at $0$ and follows the jumps, coloring the point black if it stays and blue if it crosses the dashed circle. The black shape is the Mandelbrot set.

The right picture is the Julia picture for the $c$ under the amber ring. The line is the orbit of one starting point, which ends when the point escapes or repeats, or after 96 jumps, and the repeating part is amber.

The demo starts on $c = -1$, where a point starting at $0.5$ ends up jumping back and forth between $-1$ and $0$. Moving to $(0, 0)$ on the left gives you the circle again, and moving outside the black shape breaks the Julia set into dust.

<figure data-lesson="linked-julia"></figure>

Each arrow below starts at a value of $c$ on the Mandelbrot picture and points to that value's Julia set. Six of these values lie outside the Mandelbrot set, so their Julia sets are dust, even though you can't always tell from the picture. In some you can see the gaps, as with $(0.45, 0.1)$. In others the gaps are too small to show, as with $(-0.8, 0.156)$, where a point starting at $0$ takes 252 jumps to cross the dashed circle. The point $(0, -1)$ looks outside too, but it sits on a thread too thin for this picture. Clicking a picture opens it at the top of this page.<sup><a id="julia-set-ref-4" href="#julia-set-source-4">4</a></sup>

<figure data-lesson="julia-map"></figure>

The whole dark shape, edge and inside together, is called the **filled Julia set**: every starting point that never escapes. With $c=0$ the calculation is plain squaring again, so the Julia set is the circle and the filled Julia set is the solid disk it encloses.

The computer can only test a limited number of steps, so dark pixels are only the ones that haven't escaped yet, and some may escape later. Take $c = 0.2501$. From 100 steps to 300 steps, this picture barely changes and shows a solid dark shape, so you'd probably assume it's finished. Try moving the slider to 320.

<figure data-lesson="step-limit-julia"></figure>

Most of the shape changes color between 310 and 330 steps. Every colored pixel has escaped, so the pale area is outside the filled Julia set, and its pixels look alike because they escape at about the same step. **Black and white** drops the colors, so only the pixels left over stay black.

Why would so many points escape at nearly the same step? Almost all of them must pass close to $0.5$, and that takes about 300 steps. With $c = 0.25$, the point $0.5$ would never move, because $0.5^2 + 0.25 = 0.5$. With $c = 0.2501$, it moves by only $0.0001$, so jumps near $0.5$ are very small. The point at the center of the picture spends 274 of its 315 steps within $0.05$ of $0.5$.

Some points land near $0.5$ again and repeat the slow trip, which is why you can see more of them change color at about 650 and 1000 steps. The shape above is dust too, since $c = 0.2501$ lies just outside the Mandelbrot set.

## Where the orbits go

Earlier, different pixels in the dark shape ended up on the same three places. With $c=(-0.12256, 0.74486)$, a point can do two things: it can escape, or it can join one repeating orbit, which goes $(0, 0)$, then $c$, then $(-0.66236, 0.56228)$, then $(0, 0)$ again. The point goes round that orbit forever and never stops at any of the three places. This repeating orbit is called the **attractor**. The one exception is a point exactly on the edge of the dark shape, which stays on the edge forever.<sup><a id="julia-set-ref-5" href="#julia-set-source-5">5</a></sup>

The demo below colors each starting point by its turn on the orbit, so points of one color reach the same place on the same jump and then move on together, while gray points escape. When you play it, each color bunches together and joins the orbit. It stops once every dot has joined or escaped, but the dots would go round forever.

<figure data-lesson="julia-attractor"></figure>

You can see why this happens in the dark shape, which is made of rounded pieces called lobes, with one color for each lobe. A jump moves a whole lobe onto another lobe, so its points stay together, and after enough jumps every lobe has landed on one of the three lobes that hold the orbit's places.<sup><a id="julia-set-ref-6" href="#julia-set-source-5">5</a></sup>

Notice that the orbit passes through $0$: if you start at $0$, you land on $c$, then on $(-0.66236, 0.56228)$, then back on $0$.<sup><a id="julia-set-ref-7" href="#julia-set-source-6">6</a></sup> This is why points settle so quickly, because squaring makes small numbers much smaller, as when $0.1$ becomes $0.01$. Each time a point comes back near $0$, its distance from $0$ shrinks fast, so a point $0.1$ from $0$ is $0.026$ away three jumps later, then $0.0018$, then $0.000009$. The gap keeps shrinking forever, though after about 30 jumps it is too small for the computer to store, and the numbers repeat exactly.

You might ask whether the same $c$ could have a second attractor. It can't, because Pierre Fatou and Gaston Julia proved that if a $c$ has an attractor, $0$ falls into it.<sup><a id="julia-set-ref-8" href="#julia-set-source-5">5</a></sup> The point $0$ has only one orbit, so it can fall into only one attractor. This also gives you a direct way to find the attractor: start at $0$ and follow the jumps, which is exactly what the Mandelbrot test does.

That means the Mandelbrot picture also tells you how long the orbit is, which you can check by dragging the ring in the demo. Inside the heart-shaped body, the orbit has one place, called a **fixed point**: one jump lands it on itself, so here the points really do end up in one spot. Inside the round bulb on the left, it has two places, as $c = -1$ sends $0$ to $-1$ and back, and inside the big bulbs above and below the heart, it has three.<sup><a id="julia-set-ref-9" href="#julia-set-source-7">7</a></sup> The numbers on the Mandelbrot picture mark more bulbs. Outside the black shape, $0$ escapes, so there is no attractor and all the dots escape.

You can also read that number straight off the Julia picture. Count the colors that meet at a joint of the dark shape, and for a bulb that touches the heart, that count is the number of places. The lines that meet at the main fork of the bulb's largest antenna give the same count.<sup><a id="julia-set-ref-10" href="#julia-set-source-7">7</a></sup>

Not every $c$ in the Mandelbrot set has an attractor, though. With $c = (0, 1)$, $0$ lands on a two-place orbit that pushes nearby points away, and the Julia picture has no dark area.<sup><a id="julia-set-ref-11" href="#julia-set-source-5">5</a></sup> And close to a bulb's rim, the points need far more jumps, so the demo may not find the attractor.

## Further exploring

### Videos

- [Filled Julia Set — Numberphile2](https://www.youtube.com/watch?v=oCkQ7WK7vuY)
- [What’s so special about the Mandelbrot Set? — Numberphile](https://www.youtube.com/watch?v=FFftmWSzgmk)
- [Beyond the Mandelbrot set, an intro to holomorphic dynamics — 3Blue1Brown](https://www.youtube.com/watch?v=LqbZpur38nw)
- [Julia Set in Processing — The Coding Train](https://www.youtube.com/watch?v=fAsaSkmbF5s)

### Reading

- [Julia set — Wikipedia](https://en.wikipedia.org/wiki/Julia_set)
- [Julia set — MathWorld](https://mathworld.wolfram.com/JuliaSet.html)
- [The Mandelbrot Set — Mathigon](https://mathigon.org/course/fractals/mandelbrot)
- [Understanding Julia and Mandelbrot Sets — Karl Sims](https://www.karlsims.com/julia.html)
- [How to Fold a Julia Fractal — Steven Wittens](https://acko.net/blog/how-to-fold-a-julia-fractal/)
- [The Julia Set — Complex Analysis](https://complex-analysis.com/content/julia_set.html)

## Sources and notes

1. <span id="julia-set-source-1"></span> [Introduction to Complex Dynamics](https://pi.math.cornell.edu/~lipa/mec/lesson5.html). [Back](#julia-set-ref-1)
2. <span id="julia-set-source-2"></span> Calculation: if $|z|>2$ and $|z|\ge|c|$, then $|z^2+c|\ge|z|^2-|c|\ge|z|(|z|-1)>|z|$. Here $|c|\approx0.75$. [Back](#julia-set-ref-2)
3. <span id="julia-set-source-3"></span> [Local Connectivity of Julia Sets and Bifurcation Loci: Three Theorems of J.-C. Yoccoz](https://pi.math.cornell.edu/~hubbard/hubbard.pdf). [Back](#julia-set-ref-3)
4. <span id="julia-set-source-4"></span> Diagram idea: [Julia Set Fractal (2D)](https://paulbourke.net/fractals/juliaset/). [Back](#julia-set-ref-4)
5. <span id="julia-set-source-5"></span> [Dynamics in One Complex Variable: Introductory Lectures](https://arxiv.org/abs/math/9201272). Lemma 14.2 covers the two futures and the lobes, Lemma 3.1 the edge, Lemmas 10.2 and 10.4 and Remark 10.5 the attractor and $0$, and Figure 1c the case $c = (0, 1)$. [Back](#julia-set-ref-5) [Back](#julia-set-ref-6) [Back](#julia-set-ref-8) [Back](#julia-set-ref-11)
6. <span id="julia-set-source-6"></span> Calculation: this $c$ is rounded to five decimals, so the third jump lands about $0.000004$ from $0$, and the attractor's place sits that close to $0$. Distances are measured from that place. [Back](#julia-set-ref-7)
7. <span id="julia-set-source-7"></span> [Rotation Numbers and Internal Angles of the Mandelbrot Bulbs](https://math.libretexts.org/Bookshelves/Scientific_Computing_Simulations_and_Modeling/The_Mandelbrot_and_Julia_sets_Anatomy_(Demidov)/1%3A_Quick_tour/1.1%3A_Rotation_Numbers_and_Internal_angles_of_the_Mandelbrot_bulbs). [Back](#julia-set-ref-9) [Back](#julia-set-ref-10)
