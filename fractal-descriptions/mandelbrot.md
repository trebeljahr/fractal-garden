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

Why would the body be shaped like a heart, and why is the bulb next to it round? You might assume those outlines are too complicated to write down, since so far we've only found them by testing points one at a time. But it turns out we can work out both of them exactly, and all we have to ask is when a repeat draws nearby points in.

Take the simplest repeat, a **fixed point**, which is a place that one jump leaves exactly where it is. Every $c$ has two of them, because $z^2+c=z$ is a quadratic equation. For the route from zero to get trapped at a fixed point, nearby points must be drawn toward it, so we need to know what one jump does to a tiny patch around it. If you move a tiny distance $d$ away from $z$, the square changes from $z^2$ to $z^2+2zd+d^2$, and $d^2$ is too small to matter, so close up a jump just multiplies the patch by $2z$. That means the patch gets stretched by the size of $2z$ and turned by its angle. If that stretch is below 1, every jump shrinks the patch and the points in it are drawn in, and if it's above 1, they're pushed away.

In the demo below, the ring on the left picks $c$, and the right side shows a dim patch around each repeat and, on top of it, where the jumps send that patch. A patch that shrank is amber and a patch that grew is gray. It starts inside the heart, where one fixed point has a small amber patch, and if you drag the ring across the amber curve, that patch grows past the dim one at the moment you cross.

<figure data-lesson="repeat-stretch"></figure>

That curve comes straight from the rule. A stretch of exactly 1 means $2z$ is some point $w$ on the circle of radius 1 around zero, and a fixed point has $c=z-z^2$, so $c=w/2-w^2/4$. If you send $w$ once around its circle, $c$ traces the amber curve, which is the outline of the heart, and we didn't have to test a single point to get it.

A repeat of two numbers works the same way if you treat two jumps as one. Its two numbers multiply to $c+1$, so two jumps stretch a patch by the size of $4(c+1)$.<sup><a id="mandelbrot-ref-8" href="#mandelbrot-source-8">8</a></sup> Setting that equal to 1 gives $|c+1|=1/4$, which is a circle of radius $1/4$ around $-1$, so the bulb is a perfect circle, centered on the $c=-1$ we started with. In the demo above, that repeat is the pair of patches joined by a line, which turn amber when the ring enters the bulb, and that circle is the teal curve.

This also answers something we skipped at the very beginning: why start at zero? Some other starting point might get trapped in a repeat that zero misses, in which case our black shape would be missing part of the story. The stretch $2z$ gives the reason it isn't. Zero is the one place where the stretch is exactly 0, and Pierre Fatou and Gaston Julia proved that a repeat that draws points in always catches the route from a place like that.<sup><a id="mandelbrot-ref-9" href="#mandelbrot-source-9">9</a></sup> So if any repeat draws points in, zero's route falls into it, and because zero has only one route, at most one repeat can do this for a given $c$.

So far, every calculation has started at zero, and the only thing that changed was the number we add. You could just as well do the opposite: keep $c$ fixed and try every point of the plane as the starting point. Some starting points fly off and others don't, and the edge between those two groups is called the [Julia set](/julia-set) of that $c$. Changing $c$ changes the rule, so it moves the edge too, which means every point of the plane, inside the Mandelbrot set or not, has its own Julia set. The number we add and the starting point have two coordinates each, so there are really four numbers here, and the Mandelbrot set and each Julia set are flat slices through that four-dimensional space.

In the demo below, the ring on the left picks $c$, and the right side shows every starting point for that $c$: the colored ones escape, with the color giving the number of jumps, and the dark ones don't. The ring on the right picks one starting point and draws its route. The demo begins at $c=-1$, the repeat from earlier, where the Julia set is the edge of the dark shape. A point starting at $0.5$ gets drawn into that same repeat of $0$ and $-1$, so it lies in the dark shape, and if you drag the ring to the right along the axis, past about $1.62$, the point flies off instead, because you've crossed the Julia set.

<figure data-lesson="linked-julia"></figure>

At most one repeat draws points in, but how many repeats are there altogether? Asking which points come back after one jump gives an equation with $z^2$, which has two solutions, the fixed points. Asking the same about two jumps gives an equation with $z^4$, with four solutions, which are the two fixed points and the repeat of two numbers. Each extra jump doubles the power, so ten jumps have 1,024 solutions and a million jumps have $2^{1000000}$. So every $c$ has endlessly many repeats, and the reason we never see them is that the others push points away, which means a route would have to land on one exactly.

You might wonder where they all are, and we can find out by plotting them. In the demo below, the slider sets the number of jumps, and each dot is a point that returns to where it started after that many jumps, or sooner. With a few jumps the dots look scattered, but by about ten you can see that they mark out the Julia set of that $c$, and if you move the ring outside the Mandelbrot set they mark out dust instead. That isn't a coincidence: Fatou and Julia proved that repeats that push points away lie arbitrarily close to every point of the Julia set.<sup><a id="mandelbrot-ref-10" href="#mandelbrot-source-9">9</a></sup>

<figure data-lesson="all-repeats"></figure>

Being pushed away is also what makes the edge so unpredictable. With $c=-1$, the fixed point at about $1.618$ lies on the Julia set and has a stretch of about $3.24$, so a patch around it a millionth wide reaches a width of about 1 after 12 jumps. From there the points in it go their separate ways, as the demo below shows: some fly off and others fall into the repeat of $0$ and $-1$, even though they all started less than a millionth apart. A patch of the same size inside the dark shape or outside it stays tiny and moves as one.

<figure data-lesson="tiny-patch"></figure>

This happens around every point of a Julia set, however small you make the patch: after enough jumps it covers the entire Julia set, and its images together reach every point of the plane, apart from at most two.<sup><a id="mandelbrot-ref-11" href="#mandelbrot-source-9">9</a></sup> That's why zooming in on a Julia set never shows you anything smooth, because jumps turn any tiny piece of it into all of it, so every tiny piece has to contain all of its detail.

The Mandelbrot set has no jumps that turn one part of it into another, since every point in it has a rule of its own, so you wouldn't expect it to look like any Julia set, and zoomed out it doesn't. But zoom in at the right value of $c$ and they turn into the same picture. **Fork** is $c=(0,1)$, where zero's route goes to $(0,1)$, $(-1,1)$, $(0,-1)$, $(-1,1)$, $(0,-1)$, and repeats those last two forever.

Both pictures below are centered on $c$ and use the same colors,<sup><a id="mandelbrot-ref-12" href="#mandelbrot-source-10">10</a></sup> and the right one is also turned and scaled by the amounts shown under it. As you raise the zoom, the two **Fork** pictures look the same by about ×200.

<figure data-lesson="mandelbrot-julia-zoom"></figure>

To see why they match, take a point close to $c$ in each picture. On the left, that point means adding a number slightly different from $c$, and on the right, it means starting slightly away from $c$. Either way the first stop is a tiny distance from $c$, so both routes follow zero's route for a while, and that tiny distance grows with every jump until the point breaks away and escapes. The color counts those jumps, so nearby points get matching colors. The left one does add its slightly wrong number at every jump instead of only once, but the first difference has the most jumps to grow, so the later ones barely change the total and together they act like one difference of a slightly different size and direction. Undoing that is what the turn and the scale under the pictures are for.<sup><a id="mandelbrot-ref-13" href="#mandelbrot-source-11">11</a></sup>

Tan Lei proved in 1990 that the two pictures get ever closer as you zoom in, at every $c$ where zero lands exactly on a repeat it did not start on,<sup><a id="mandelbrot-ref-14" href="#mandelbrot-source-12">12</a></sup> and any stretch of the Mandelbrot set's edge, however short, contains values like that.<sup><a id="mandelbrot-ref-15" href="#mandelbrot-source-13">13</a></sup> So all along the edge, there are places where zooming in shows you a Julia set. The Mandelbrot picture does also hold tiny black copies of the whole set, which these Julia sets don't have, but the copies shrink faster than their distance to $c$, so they get too small to see as you zoom.<sup><a id="mandelbrot-ref-16" href="#mandelbrot-source-12">12</a></sup>

All of this came from one rule, $z^2+c$, so you might think the shape belongs to that rule. To see that it doesn't, take [Newton's method](/newton-fractal), which finds where a polynomial $p$ reaches zero by repeating $z\to z-p(z)/p'(z)$ on a first guess. It nearly always arrives at a root, but it doesn't have to: for $z^3-2z+2$, the guess $0$ goes to $1$ and the guess $1$ goes back to $0$, and guesses close to them are drawn into that repeat and never reach a root. So how common are polynomials like that?

We can ask this about every polynomial with the roots $-1$, $1$ and a third root that we're free to move, which gives one polynomial for each point of the plane. You'd expect to have to try every first guess for each one, but the fact about zero helps again. This rule's stretch is 0 at the three roots, and at only one other place, the average of the roots.<sup><a id="mandelbrot-ref-17" href="#mandelbrot-source-14">14</a></sup> The route from a root can't join a repeat, because a root stays where it is, so a repeat that draws guesses in has to catch the route from the average, which means one guess is enough. Coloring each point by the root that this guess reaches, and black if it reaches none, is the same recipe as the Mandelbrot set: one fixed start, and a rule that changes from point to point.

<figure data-lesson="newton-copy"></figure>

Zoomed out, the picture has hardly any black, which is good news if you want to find roots. But if you play the zoom toward one of those black specks, you get the heart, the round bulb and the threads again, in a question about finding roots of cubic polynomials. Curtis McMullen proved that this isn't a coincidence: in any family of rules made by dividing one polynomial by another, tiny copies of this shape are packed throughout the places where the behavior changes.<sup><a id="mandelbrot-ref-18" href="#mandelbrot-source-15">15</a></sup>

## Further exploring

### Videos

- [The Mandelbrot Set — Numberphile](https://www.youtube.com/watch?v=NGMRB4O922I)
- [What’s so special about the Mandelbrot Set? — Numberphile](https://www.youtube.com/watch?v=FFftmWSzgmk)
- [Beyond the Mandelbrot set, an intro to holomorphic dynamics — 3Blue1Brown](https://www.youtube.com/watch?v=LqbZpur38nw)
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
8. <span id="mandelbrot-source-8"></span> Calculation: a repeat of two numbers solves $z^2+z+c+1=0$, because $z_1^2+c=z_2$ and $z_2^2+c=z_1$ subtract to give $z_1+z_2=-1$. So $z_1z_2=c+1$, and by the chain rule two jumps multiply a tiny patch by $2z_1\cdot2z_2=4(c+1)$. [Back](#mandelbrot-ref-8)
9. <span id="mandelbrot-source-9"></span> [Dynamics in One Complex Variable: Introductory Lectures](https://arxiv.org/abs/math/9201272). Lemma 10.2 says a repeat that draws points in catches a place of zero stretch, Theorem 11.1 covers the repeats in the Julia set, and Lemma 3.7 and section 11.2 cover the growing patch. [Back](#mandelbrot-ref-9) [Back](#mandelbrot-ref-10) [Back](#mandelbrot-ref-11)
10. <span id="mandelbrot-source-10"></span> Diagram construction: the Mandelbrot count includes the first jump, from zero to the number being tested. A starting point in the right picture is already there, so that picture adds one to its count. [Back](#mandelbrot-ref-12)
11. <span id="mandelbrot-source-11"></span> Calculation: a point $d$ away from $c$ in the left picture matches a point $wd$ away from $c$ in the right picture, where $w=\lim_{n\to\infty}\frac{\partial z_n/\partial c}{\partial z_n/\partial z_1}$ along zero's route. This equals the sum of $1/(\partial z_k/\partial z_1)$ over $k\ge1$, whose terms are the errors. At $c=(0,1)$ their sizes are $1$, $0.5$, $0.18$, $0.088$, and so on, each turned differently, and $w=0.8-0.4i$. [Back](#mandelbrot-ref-13)
12. <span id="mandelbrot-source-12"></span> [Similarity Between the Mandelbrot Set and Julia Sets](https://web.archive.org/web/20221206041349/https://math.univ-angers.fr/~tanlei/papers/similarityMJ.pdf). Theorem 5.1 states the match, and section 6 gives the sizes of the small copies. [Back](#mandelbrot-ref-14) [Back](#mandelbrot-ref-16)
13. <span id="mandelbrot-source-13"></span> [Misiurewicz point](https://en.wikipedia.org/wiki/Misiurewicz_point). [Back](#mandelbrot-ref-15)
14. <span id="mandelbrot-source-14"></span> Calculation: the derivative of $z-p/p'$ is $pp''/p'^2$. It is zero where $p=0$ and where $p''=0$. For a cubic, $p''=0$ only at the average of the three roots. [Back](#mandelbrot-ref-17)
15. <span id="mandelbrot-source-15"></span> [The Mandelbrot set is universal](https://people.math.harvard.edu/~ctm/papers/home/text/papers/muniv/muniv.pdf). In some families the copies come from $z^d+c$ with a higher power $d$. [Back](#mandelbrot-ref-18)
