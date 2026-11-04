# Mandelbrot Set

The Mandelbrot set comes from one short rule:

$$
z_{n+1}=z_n^2+c
$$

You pick a number $c$, start with $z_0=0$, and keep feeding each answer back into the rule. With $c=1$ you get

$$
0\to1\to2\to5\to26\to\cdots
$$

and the numbers fly off toward infinity. With $c=-1$ you get

$$
0\to-1\to0\to-1\to\cdots
$$

and you're trapped between those two numbers forever. The Mandelbrot set is all the values of $c$ that don't fly off.

To draw it, each pixel needs its own $c$, and because a pixel has two coordinates, $c$ needs two parts, which makes it a **complex number**. Adding $c$ moves a point sideways and up or down, and squaring multiplies the point's distance from zero by itself and doubles its angle from the line pointing right.<sup><a id="mandelbrot-ref-1" href="#mandelbrot-source-1">1</a></sup>

In the demo below, the ring is $c$, the point starts at zero, and each dot is one more use of the rule, so the dots trace the point's route. Once the point crosses the dashed circle, two units from zero, every later jump takes it farther away,<sup><a id="mandelbrot-ref-2" href="#mandelbrot-source-2">2</a></sup> which means it has flown off. If you move your pointer around the plane, the ring follows it, and some values of $c$ draw the point in toward one spot, some trap it in a repeat of a few spots, and some throw it past the circle.

<figure data-lesson="orbit-shapes"></figure>

That gives us a way to draw the set: test the $c$ of every pixel, and color the pixel black if its point stays inside the circle. Doing that gives the shape below, and every pixel in it still has a route you can follow. The ring starts on $c=-1$, so click it to see the repeat from earlier, then pick a pixel near $c=0.5$ on the horizontal axis to see the amber point fly off.

<figure data-orbit="mandelbrot"></figure>

Benoit Mandelbrot's first printouts of this shape looked dirty, and he blamed his equipment. Some of the specks changed from one print to the next, so those really were dirt. But others came in matching pairs, one at the top and its mirror image at the bottom, which is hard to explain with bad equipment. When he zoomed in on those pieces, they turned out to be smaller, slightly deformed copies of the whole shape.<sup><a id="mandelbrot-ref-3" href="#mandelbrot-source-3">3</a></sup>

<figure data-article-images="mandelbrot-printout"></figure>

A printout of asterisks can only show a rough outline, so how much detail does the edge really hold? It never runs out: however far you zoom in, the edge is still there, with new shapes in it. Below are a few of the places you can reach, among them a spiral, a star, a thread that forks again and again, and a whole tiny copy of the set.

<figure data-lesson="mandelbrot-zoom-map"></figure>

The deepest is $10^{100}$ times closer. To get a feel for that, if this view were as wide as an atom, the whole set would be far wider than the observable universe. If you click one of these pictures, it opens in the explorer at the top of this page, and you can keep zooming in from there without ever reaching a point where the detail stops.

You might expect shapes this different to need different rules, but every one of these pictures comes from the rule we started with, $z_{n+1}=z_n^2+c$. The only thing that changes from pixel to pixel is $c$, and near the edge, values that fly off and values that don't sit right next to each other at every scale, so the smallest change in $c$ can give a completely different route.

You might wonder how the computer decides which pixels to paint black. A number belongs to the set if its point never crosses the dashed circle, and a computer can't wait forever to find out that something never happens. If the point crosses the circle, we know for sure that it has **escaped**. But if it's still inside after 300 jumps, it might cross on jump 301, so the computer has to give up at some point and paint the pixel black anyway. That means a black pixel only tells you the point hasn't escaped yet.

The next demo adds more information by coloring each escaped pixel according to how many jumps it took, so any colored pixel is definitely outside the set. The colors repeat every 40 steps, so one color can mean step 30 or step 70.

The slider sets how many steps the computer tries before giving up. In **Whole set**, more steps turn black pixels into colored ones until the heart and the bulb appear.

To see how wrong black can be, look at **Spiral**, a tiny part of the edge near the narrow neck where the bulb meets the heart. If the computer tries 200 steps, you get round black dots that look like small bulbs of the set. If it tries 1000 steps, almost all of those dots turn to color, so those points were outside the set all along and 200 steps wasn't enough to catch them. The dark band across the middle looks black at every step limit, but those pixels escaped at about step 40, and the color for step 40 happens to be nearly black.

If you switch to **Black and white**, white pixels have escaped and black pixels haven't, and at high step counts the black is left as specks that look like separate islands. But it has been proved that the set is all one connected piece,<sup><a id="mandelbrot-ref-4" href="#mandelbrot-source-4">4</a></sup> so something must join those specks. You can't see it because each pixel tests only one point, and the parts doing the joining are so thin that those test points almost always miss them.

<figure data-lesson="step-limit-mandelbrot"></figure>

You might wonder how high a step limit would have to be to catch everything, and the neck shows that no limit is high enough. Start at $-0.75$, where the bulb meets the body, and move straight up. A point $0.1$ above it crosses the dashed circle after 33 steps. A point $0.01$ above it takes 315 steps, $0.001$ above takes 3143, and $0.0001$ above takes 31417. The closer you get, the longer it takes.

There's something odd about those counts. If you multiply each one by its distance, you get $3.3$, $3.15$, $3.143$, $3.1417$, which seem to be heading for π.<sup><a id="mandelbrot-ref-5" href="#mandelbrot-source-5">5</a></sup> Nothing in this calculation looks like it should involve π.

The parts of the black shape also differ in what the point does there. Inside the heart-shaped body, it settles toward one value,<sup><a id="mandelbrot-ref-6" href="#mandelbrot-source-6">6</a></sup> and inside the round bulb on the left, it gets trapped in a two-number repeat, like the $0,-1$ at that bulb's center. The big bulbs above and below the heart give a three-number repeat, and smaller bulbs give other lengths.<sup><a id="mandelbrot-ref-7" href="#mandelbrot-source-7">7</a></sup> If you follow these lengths along the horizontal axis, you get the branching picture of the [logistic map](/logistic-map).

So far, every calculation has started at zero, and the only thing that changed was the number we add. You could just as well do the opposite: keep $c$ fixed and try every point of the plane as the starting point. Some starting points fly off and others don't, and the edge between those two groups is called the [Julia set](/julia-set) of that $c$. Changing $c$ changes the rule, so it moves the edge too, which means every point of the plane, inside the Mandelbrot set or not, has its own Julia set.

In the demo below, the ring on the left picks $c$, and the right side shows every starting point for that $c$: the colored ones escape, with the color giving the number of jumps, and the dark ones don't. The ring on the right picks one starting point and draws its route. The demo begins at $c=-1$, the repeat from earlier, where the Julia set is the edge of the dark shape. A point starting at $0.5$ gets drawn into that same repeat of $0$ and $-1$, so it lies in the dark shape, and if you drag the ring to the right along the axis, past about $1.62$, the point flies off instead, because you've crossed the Julia set.

<figure data-lesson="linked-julia"></figure>

The two kinds of picture ask different questions, so you wouldn't expect them to have much to do with each other, and zoomed out they don't look alike. But zoom in at the right value of $c$ and they turn into the same picture.

If you take $c=(0,1)$ and start at zero, the point goes to $(0,1)$, $(-1,1)$, $(0,-1)$, $(-1,1)$, $(0,-1)$, and repeats those last two forever. A point close to that repeat moves farther from it every two jumps.

Both pictures below are centered on $c$ and use the same colors,<sup><a id="mandelbrot-ref-8" href="#mandelbrot-source-8">8</a></sup> and the right one is also turned and scaled by the amounts shown under it. As you raise the zoom, the two **Fork** pictures look the same by about ×200.

<figure data-lesson="mandelbrot-julia-zoom"></figure>

Why would they match? Every point on the left uses a different number to add, while every point on the right uses the same one, so these are really two different calculations.

To see what's going on, take one point near the center of each picture. The point on the left means adding a number close to $c$, so the first jump from zero lands close to $c$. The point on the right means starting close to $c$. So both routes begin a tiny distance from $c$, both follow zero's route for a while, and then that tiny distance grows until they leave the route and escape. The color is the number of jumps that took.

That isn't quite the whole story, because the two calculations differ in one way. The one on the right is off by a small amount once, at the start, whereas the one on the left adds a slightly wrong number at every jump, so it picks up the same small error over and over. You might expect all those extra errors to ruin the match.

The reason they don't is that an error keeps growing after it happens. At **Fork**, an error gets about 5.7 times larger every two jumps, so the first error has the most time to grow and each later one has less. Measured at the same moment, the second error is half the size of the first, the third about a sixth and the fourth about an eleventh, so the later ones barely change the total.

If you add all of them up, each with its own direction, you get one fixed number, $(0.8,-0.4)$. In other words, all those errors have the same effect as one error at the start, 0.89 times the size and turned 27° clockwise. Undoing that lines up the pictures, which is where the 27° and ×1.12 under **Fork** come from. Each $c$ has its own pair.<sup><a id="mandelbrot-ref-9" href="#mandelbrot-source-9">9</a></sup>

None of this relies on anything special about **Fork**. Tan Lei proved in 1990 that zooming in brings the two pictures ever closer at every $c$ where zero lands exactly on a repeat it did not start on.<sup><a id="mandelbrot-ref-10" href="#mandelbrot-source-10">10</a></sup> **Star** and **Spiral** are two more. At **Spiral**, near the neck, zero takes 24 jumps to land, and the pictures need more zoom to match.

These values of $c$ are also everywhere: any stretch of the Mandelbrot set's edge, however short, contains some.<sup><a id="mandelbrot-ref-11" href="#mandelbrot-source-11">11</a></sup> So all along the edge, there are places where zooming in shows you a Julia set.

One difference remains however far you zoom. The Mandelbrot picture has black specks, which are small copies of the whole set, and this Julia set has no inside to show black. But copies closer to $c$ shrink faster than their distance to $c$, so the specks get too small to see as you zoom.<sup><a id="mandelbrot-ref-12" href="#mandelbrot-source-10">10</a></sup>

## Further exploring

### Videos

- [The Mandelbrot Set — Numberphile](https://www.youtube.com/watch?v=NGMRB4O922I)
- [What’s so special about the Mandelbrot Set? — Numberphile](https://www.youtube.com/watch?v=FFftmWSzgmk)
- [Beyond the Mandelbrot set, an intro to holomorphic dynamics — 3Blue1Brown](https://www.youtube.com/watch?v=LqbZpur38nw)
- [Times Tables, Mandelbrot and the Heart of Mathematics — Mathologer](https://www.youtube.com/watch?v=qhbuKbxJsk8)
- [Mandelbrot Set — The Coding Train](https://www.youtube.com/watch?v=6z7GQewK-Ks)

### Reading

- [Mandelbrot set — Wikipedia](https://en.wikipedia.org/wiki/Mandelbrot_set)
- [Mandelbrot set — MathWorld](https://mathworld.wolfram.com/MandelbrotSet.html)
- [The Mandelbrot Set — Mathigon](https://mathigon.org/course/fractals/mandelbrot)
- [The Quest to Decode the Mandelbrot Set — Quanta Magazine](https://www.quantamagazine.org/the-quest-to-decode-the-mandelbrot-set-maths-famed-fractal-20240126/)
- [The Encyclopedia of the Mandelbrot Set — Mu-Ency](https://mrob.com/pub/muency.html)
- [What is the Mandelbrot set? — Plus Magazine](https://plus.maths.org/what-mandelbrot-set)
- [The Fractal Geometry of the Mandelbrot Set — Robert Devaney](https://math.bu.edu/DYSYS/FRACGEOM/FRACGEOM.html)

## Sources and notes

1. <span id="mandelbrot-source-1"></span> [Introduction to Complex Dynamics](https://pi.math.cornell.edu/~lipa/mec/lesson5.html). [Back](#mandelbrot-ref-1)
2. <span id="mandelbrot-source-2"></span> Calculation: if $|z|>2$ and $|z|\ge|c|$, then $|z^2+c|\ge|z|^2-|c|\ge|z|(|z|-1)>|z|$. A crossing gives $|z|\ge|c|$: either $|c|\le2$, or the first jump lands on $c$. [Back](#mandelbrot-ref-2)
3. <span id="mandelbrot-source-3"></span> [Development of the Mandelbrot set; 'dirt' in the picture](https://www.webofstories.com/play/10522). [Back](#mandelbrot-ref-3)
4. <span id="mandelbrot-source-4"></span> [Exploring the Mandelbrot Set: The Orsay Notes](https://pi.math.cornell.edu/~hubbard/OrsayEnglish.pdf). [Back](#mandelbrot-ref-4)
5. <span id="mandelbrot-source-5"></span> [Pi in the Mandelbrot set everywhere](https://arxiv.org/abs/2505.07138). Its proof follows curved paths into the neck. Along this straight line, the pattern has only been observed. [Back](#mandelbrot-ref-5)
6. <span id="mandelbrot-source-6"></span> [Local Connectivity of Julia Sets and Bifurcation Loci: Three Theorems of J.-C. Yoccoz](https://pi.math.cornell.edu/~hubbard/hubbard.pdf). [Back](#mandelbrot-ref-6)
7. <span id="mandelbrot-source-7"></span> [Rotation Numbers and Internal Angles of the Mandelbrot Bulbs](https://math.libretexts.org/Bookshelves/Scientific_Computing_Simulations_and_Modeling/The_Mandelbrot_and_Julia_sets_Anatomy_(Demidov)/1%3A_Quick_tour/1.1%3A_Rotation_Numbers_and_Internal_angles_of_the_Mandelbrot_bulbs). [Back](#mandelbrot-ref-7)
8. <span id="mandelbrot-source-8"></span> Diagram construction: the Mandelbrot count includes the first jump, from zero to the number being tested. A starting point in the right picture is already there, so that picture adds one to its count. [Back](#mandelbrot-ref-8)
9. <span id="mandelbrot-source-9"></span> Calculation: a point $d$ away from $c$ in the left picture matches a point $wd$ away from $c$ in the right picture, where $w=\lim_{n\to\infty}\frac{\partial z_n/\partial c}{\partial z_n/\partial z_1}$ along zero's route. This equals the sum of $1/(\partial z_k/\partial z_1)$ over $k\ge1$, whose terms are the errors. At $c=(0,1)$ their sizes are $1$, $0.5$, $0.18$, $0.088$, and so on, each turned differently, and $w=0.8-0.4i$. [Back](#mandelbrot-ref-9)
10. <span id="mandelbrot-source-10"></span> [Similarity Between the Mandelbrot Set and Julia Sets](https://web.archive.org/web/20221206041349/https://math.univ-angers.fr/~tanlei/papers/similarityMJ.pdf). Theorem 5.1 states the match, and section 6 gives the sizes of the small copies. [Back](#mandelbrot-ref-10) [Back](#mandelbrot-ref-12)
11. <span id="mandelbrot-source-11"></span> [Misiurewicz point](https://en.wikipedia.org/wiki/Misiurewicz_point). [Back](#mandelbrot-ref-11)
