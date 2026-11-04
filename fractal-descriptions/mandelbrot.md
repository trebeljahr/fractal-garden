# Mandelbrot Set

The Mandelbrot set comes from one short rule:

$$
z\to z^2+c
$$

You pick a number $c$, start with $z=0$, and keep feeding each answer back into the rule. With $c=1$ you get $0\to1\to2\to5\to26\to\cdots$, and the numbers fly off toward infinity. With $c=-1$ you get $0,-1,0,-1,\ldots$, and you're trapped between those two numbers forever. The Mandelbrot set is all the values of $c$ that don't fly off.

To draw it, each pixel needs its own $c$. A pixel has two coordinates, so $c$ gets two parts, one for how far to move left or right and one for how far to move up or down, which makes it a **complex number**. Adding $c$ moves a point by those two amounts, and squaring multiplies the point's distance from zero by itself and doubles its angle from the line pointing right.<sup><a id="mandelbrot-ref-1" href="#mandelbrot-source-1">1</a></sup>

In the demo below, the ring is $c$ and the point starts at zero. Each time you apply the rule, the point jumps to the next $z$, shown as a dot, and a thin line joins the dots in order. Once the point crosses the dashed circle, two units from zero, every later jump takes it farther away,<sup><a id="mandelbrot-ref-2" href="#mandelbrot-source-2">2</a></sup> so crossing means it has flown off. As you run your pointer across the plane, or slide sideways on a phone, you'll see some values of $c$ draw the point in toward one spot, some trap it in a repeat of a few spots, and some throw it past the circle. The route ends at its first repeat.

<figure data-lesson="orbit-shapes"></figure>

That gives us a way to draw the set: test each $c$, and color it dark if its point stays inside the circle. The plane below sits closer in, so the circle is out of view. Moving your pointer over it, or sliding sideways on a phone, tests the values nearby, and each one turns dark if its point stays within two units of zero for 300 jumps.

**Draw the rest** tests every value, and the dark shape you end up with is the Mandelbrot set.

<figure data-lesson="paint-mandelbrot"></figure>

This is the finished picture, and every pixel in it still has a route you can follow. The ring starts on $c=-1$, so click it to see the repeat from earlier, then pick a pixel near $c=1$ on the horizontal axis to see the amber point fly off.

<figure data-orbit="mandelbrot"></figure>

Benoit Mandelbrot's first printouts of this shape looked dirty, and he blamed his equipment. Some of the specks changed from one print to the next, so those really were dirt. But others came in matching pairs, one at the top and its mirror image at the bottom, which is hard to explain with bad equipment. When he zoomed in on those pieces, they turned out to be smaller, slightly deformed copies of the whole shape.<sup><a id="mandelbrot-ref-3" href="#mandelbrot-source-3">3</a></sup>

<figure data-article-images="mandelbrot-printout"></figure>

A printout of asterisks can only show a rough outline, so how much detail does the edge really hold? Each arrow below starts at a place on the edge and points to that place enlarged, with a caption saying how many times closer it is than the whole set. One place has a spiral, another a star, another a thread that forks again and again, and one holds a whole tiny copy of the set, and all of them come from squaring and adding.

<figure data-lesson="mandelbrot-zoom-map"></figure>

The deepest is $10^{100}$ times closer. To get a feel for that, if this view were as wide as an atom, the whole set would be far wider than the observable universe. Every picture still has an edge, so you can zoom into it again: clicking one opens it in the explorer at the top of this page.

There's a problem hiding in the definition. A number belongs to the set if its point never crosses the dashed circle, but a computer can't wait forever to check “never”. All it can say is that a point has **escaped** by crossing the circle, or that it hasn't escaped yet, and that's all black really means.

The next demo adds more information by coloring each escaped pixel according to how many jumps it took, so any colored pixel is definitely outside the set. The colors repeat every 40 steps, so one color can mean step 30 or step 70.

The slider sets how many steps the computer tries before giving up. In **Whole set**, more steps turn black pixels into colored ones until the heart and the bulb appear.

**Spiral** shows how misleading black can be. It's a tiny piece of the edge, near the narrow neck where the bulb meets the heart. At 200 steps you'll see round black dots that look like small bulbs, but by 1000 steps almost all of that black is gone, which means those points were outside the set all along. The dark band across the middle was never black, by the way: those pixels escaped at about step 40.

**Black and white** drops the colors, so white pixels have escaped and black pixels haven't. At high step counts, the black specks look like separate islands, even though the set is all one connected piece.<sup><a id="mandelbrot-ref-4" href="#mandelbrot-source-4">4</a></sup> You can't see the connections because each pixel tests only one point, and the parts joining the specks are too thin to show.

<figure data-lesson="step-limit-mandelbrot"></figure>

You might wonder how high a step limit would have to be to catch everything, and the neck shows that no limit is high enough. Start at $-0.75$, where the bulb meets the body, and move straight up. A point $0.1$ above it crosses the dashed circle after 33 steps. A point $0.01$ above it takes 315 steps, $0.001$ above takes 3143, and $0.0001$ above takes 31417. The closer you get, the longer it takes.

There's something odd about those counts. If you multiply each one by its distance, you get $3.3$, $3.15$, $3.143$, $3.1417$, which seem to be heading for π.<sup><a id="mandelbrot-ref-5" href="#mandelbrot-source-5">5</a></sup> Nothing in this calculation looks like it should involve π.

The parts of the black shape also differ in what the point does there. Inside the heart-shaped body, it settles toward one value,<sup><a id="mandelbrot-ref-6" href="#mandelbrot-source-6">6</a></sup> and inside the round bulb on the left, it gets trapped in a two-number repeat, like the $0,-1$ at that bulb's center. The big bulbs above and below the heart give a three-number repeat, and smaller bulbs give other lengths.<sup><a id="mandelbrot-ref-7" href="#mandelbrot-source-7">7</a></sup> If you follow these lengths along the horizontal axis, you get the branching picture of the [logistic map](/logistic-map).

So far, every calculation has started at zero, and the only thing we've changed is the number we add. You could just as well do the opposite: fix the number you add and let every pixel be a different starting point. The result is called a [Julia picture](/julia-set), and since there's one for every choice of $c$, each point in the Mandelbrot picture has a whole shape of its own.

<figure data-lesson="linked-julia"></figure>

The two kinds of picture ask different questions, so you wouldn't expect them to have much to do with each other, and zoomed out they don't look alike. But zoom in at the right value of $c$ and they turn into the same picture.

If you take $c=(0,1)$ and start at zero, the point goes to $(0,1)$, $(-1,1)$, $(0,-1)$, $(-1,1)$, $(0,-1)$, and repeats those last two forever. A point close to that repeat moves farther from it every two jumps.

Both pictures below are centered on $c$ and use the same colors,<sup><a id="mandelbrot-ref-8" href="#mandelbrot-source-8">8</a></sup> and the Julia picture is also turned and scaled by the amounts shown under it. As you raise the zoom, the two **Fork** pictures look the same by about ×200.

<figure data-lesson="mandelbrot-julia-zoom"></figure>

Why would they match? Every pixel on the left uses a different number to add, while every pixel on the right uses the same one, so these are really two different calculations.

To see what's going on, follow one pixel from each picture. The Mandelbrot pixel adds a number close to $c$, so its first jump from zero lands close to $c$. The Julia pixel starts close to $c$ because that's where we're looking. So both points begin a tiny distance from $c$, both follow zero's route for a while, and then that tiny distance grows until they leave the route and escape. The color is the number of jumps that took.

That isn't quite the whole story, because the two points differ in one way. The Julia point is off by a small amount once, at the start, whereas the Mandelbrot point adds a slightly wrong number at every jump, so it picks up the same small error over and over. You might expect all those extra errors to ruin the match.

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
8. <span id="mandelbrot-source-8"></span> Diagram construction: the Mandelbrot count includes the first jump, from zero to the pixel's number. A Julia pixel starts there, so the right picture adds one to its count. [Back](#mandelbrot-ref-8)
9. <span id="mandelbrot-source-9"></span> Calculation: a Mandelbrot pixel $d$ away from $c$ matches a Julia pixel $wd$ away from $c$, where $w=\lim_{n\to\infty}\frac{\partial z_n/\partial c}{\partial z_n/\partial z_1}$ along zero's route. This equals the sum of $1/(\partial z_k/\partial z_1)$ over $k\ge1$, whose terms are the errors. At $c=(0,1)$ their sizes are $1$, $0.5$, $0.18$, $0.088$, and so on, each turned differently, and $w=0.8-0.4i$. [Back](#mandelbrot-ref-9)
10. <span id="mandelbrot-source-10"></span> [Similarity Between the Mandelbrot Set and Julia Sets](https://web.archive.org/web/20221206041349/https://math.univ-angers.fr/~tanlei/papers/similarityMJ.pdf). Theorem 5.1 states the match, and section 6 gives the sizes of the small copies. [Back](#mandelbrot-ref-10) [Back](#mandelbrot-ref-12)
11. <span id="mandelbrot-source-11"></span> [Misiurewicz point](https://en.wikipedia.org/wiki/Misiurewicz_point). [Back](#mandelbrot-ref-11)
