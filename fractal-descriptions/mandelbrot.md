# Mandelbrot Set

Start with zero. Square it, then add $1$. Use the answer as your next starting number and repeat:

$$
0\to1\to2\to5\to26\to\cdots
$$

The answers grow larger and larger. Now add $-1$ each time instead. You get $0,-1,0,-1,\ldots$: the same two numbers, forever.

The Mandelbrot picture tests which numbers you can add without the answers growing beyond every limit.

<figure data-article-images="mandelbrot"></figure>

Each pixel gives us a number to try. Its horizontal coordinate tells us how far to move left or right; its vertical coordinate tells us how far to move up or down. Together, these form a **complex number**, which we call $c$.

Adding $c$ moves the point by those two amounts. Squaring changes both its distance from zero and its direction: multiply the distance by itself and double the angle from the line pointing right.<sup><a id="mandelbrot-ref-1" href="#mandelbrot-source-1">1</a></sup>

On the plane below, the ring marks the number you add. The point starts at zero and jumps once for each square and add. The dots show where it lands, and the thin line joins them in order. If it crosses the dashed circle, two units from zero, every later jump takes it farther away.<sup><a id="mandelbrot-ref-2" href="#mandelbrot-source-2">2</a></sup>

Move your pointer across the plane, or slide sideways on a phone. Some numbers pull the point in to one spot, some make it repeat a few spots forever, and some throw it out. The route ends at its first repeat.

<figure data-lesson="orbit-shapes"></figure>

Now test many numbers at once. Each square below stands for the number at its center. Move your pointer over the plane to test squares: a square turns dark if the point stays inside the dashed circle for 300 jumps, and blue if it crosses.

Press **Fill the rest** to test every square. The dark shape is a rough Mandelbrot set.

<figure data-lesson="paint-mandelbrot"></figure>

Give every pixel its own test and the edge sharpens. In this picture, the ring marks the number you chose. It starts on $-1$, so click it to see the repeat. Then pick a pixel near $1$ on the horizontal axis and watch the amber point leave.

<figure data-orbit="mandelbrot"></figure>

Benoit Mandelbrot's first printouts of this shape looked dirty, and he blamed his equipment. Some specks changed from one print to the next, so they were dirt. Others came in matching pairs, one at the top and its mirror image at the bottom. Bad equipment was unlikely to do that. He zoomed in on those pieces, and they were smaller, slightly deformed copies of the whole shape.<sup><a id="mandelbrot-ref-3" href="#mandelbrot-source-3">3</a></sup>

<figure data-article-images="mandelbrot-printout"></figure>

A number belongs to the Mandelbrot set if the point never crosses the dashed circle. A point that crosses has **escaped**. The computer cannot wait forever, so black means “hasn't escaped yet.”

In the next demo, color says more: each pixel shows how many jumps its point took to escape, with one color for each count.

Every colored pixel has escaped, so it is outside the set. The colors repeat every 40 steps, so one color can mean step 30 or step 70.

Move the slider to choose how many steps the computer calculates before it stops. In **Whole set**, more steps turn black pixels into colored ones until the heart and the bulb appear.

**Spiral** shows a tiny piece of the edge, near the neck. The dark band across the middle isn't black: those pixels escaped at about step 40. At 200 steps there are also round black dots that look like small bulbs. By 1000 steps, almost all of that black is gone. Those points were outside the set all along.

**Black and white** drops the colors: white pixels have escaped, and black pixels haven't. At high step counts, black specks look separate, but the set is one connected piece.<sup><a id="mandelbrot-ref-4" href="#mandelbrot-source-4">4</a></sup> Each pixel tests only one point, so the parts joining the specks are too thin to show.

<figure data-lesson="step-limit-mandelbrot"></figure>

Points near the neck can take much longer. Start at $-0.75$, where the bulb meets the body, and move straight up. A point $0.1$ above it crosses the dashed circle after 33 steps. A point $0.01$ above it takes 315 steps, $0.001$ above takes 3143, and $0.0001$ above takes 31417. Closer points take longer, so no step limit catches every point.

Now multiply each count by its distance: $3.3$, $3.15$, $3.143$, $3.1417$. These answers seem to be heading for π.<sup><a id="mandelbrot-ref-5" href="#mandelbrot-source-5">5</a></sup>

Look at the round bulb on the left. Numbers inside it approach a two-number repeat, like the $0,-1$ example at its center. Numbers inside the heart-shaped body settle toward one value.<sup><a id="mandelbrot-ref-6" href="#mandelbrot-source-6">6</a></sup> Numbers inside the big bulbs above and below the heart approach a three-number repeat, and smaller bulbs have other lengths.<sup><a id="mandelbrot-ref-7" href="#mandelbrot-source-7">7</a></sup> Along the horizontal axis, these lengths make the branching picture of the [logistic map](/logistic-map).

So far, every calculation has started at zero. Keep the number you add, but try a different starting point at every pixel. This makes a [Julia picture](/julia-set). A single choice in the Mandelbrot picture now gives us a whole new shape to explore.

<figure data-lesson="linked-julia"></figure>

The two pictures above look nothing alike. Zoom in at the right value of $c$ and they match.

Take $c=(0,1)$. Starting at zero, the point goes to $(0,1)$, $(-1,1)$, $(0,-1)$, $(-1,1)$, $(0,-1)$, and repeats those two forever. A point close to that repeat moves farther from it every two jumps.

Below, both pictures are centered on $c$ and use the same colors.<sup><a id="mandelbrot-ref-8" href="#mandelbrot-source-8">8</a></sup> The Julia picture is also turned and scaled by the amounts shown under it. Move the slider. By about ×200, the two **Fork** pictures look the same.

<figure data-lesson="mandelbrot-julia-zoom"></figure>

A Mandelbrot pixel near $c$ adds a number close to $c$, so its first jump from zero lands close to $c$. A Julia pixel near $c$ starts close to $c$. Both points follow zero's route for a while, then move away from the repeat and escape. The color shows how many jumps that takes.

The Julia point differs from $c$ once, at the start. The Mandelbrot point gets the same difference added again at every jump. All those additions have the same effect as starting somewhere else: the difference gets multiplied by one fixed complex number. Multiplying by a complex number turns and scales. That is the turn and scale under the pictures, and each $c$ has its own.<sup><a id="mandelbrot-ref-9" href="#mandelbrot-source-9">9</a></sup>

Tan Lei proved in 1990 that zooming in brings the two pictures ever closer at every $c$ where zero lands exactly on a repeat it did not start on.<sup><a id="mandelbrot-ref-10" href="#mandelbrot-source-10">10</a></sup> **Star** and **Spiral** are two more. At **Spiral**, near the neck, zero takes 24 jumps to land, and the pictures need more zoom to match.

They never match exactly. The Mandelbrot picture has black specks, small copies of the whole set, and this Julia set has no inside to show black. Copies closer to $c$ shrink faster than their distance to $c$, so the specks get too small to see as you zoom.<sup><a id="mandelbrot-ref-11" href="#mandelbrot-source-10">10</a></sup>

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
9. <span id="mandelbrot-source-9"></span> Calculation: a Mandelbrot pixel $d$ away from $c$ matches a Julia pixel $wd$ away from $c$, where $w=\lim_{n\to\infty}\frac{\partial z_n/\partial c}{\partial z_n/\partial z_1}$ along zero's route. At $c=(0,1)$, $w=0.8-0.4i$. [Back](#mandelbrot-ref-9)
10. <span id="mandelbrot-source-10"></span> [Similarity Between the Mandelbrot Set and Julia Sets](https://web.archive.org/web/20221206041349/https://math.univ-angers.fr/~tanlei/papers/similarityMJ.pdf). Theorem 5.1 states the match, and section 6 gives the sizes of the small copies. [Back](#mandelbrot-ref-10) [Back](#mandelbrot-ref-11)
