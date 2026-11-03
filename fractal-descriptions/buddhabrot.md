# Buddhabrot

Choose a number. Start at zero, square, add your chosen number, and repeat. This is the same calculation used for the [Mandelbrot set](/mandelbrot).

The Mandelbrot picture colors the pixel you chose. A Buddhabrot records the places the calculation visits along the way. If the results escape, put a faint dot at each saved position. If they don't, leave that route out.<sup><a id="buddhabrot-ref-1" href="#buddhabrot-source-1">1</a></sup>

The gray shape below is the Mandelbrot set, turned on its side. Move over the left picture to try a number, and click or tap to keep one. Its route appears in amber, one dot for each saved position. Press **Record this route** twice and the same squares brighten. A number inside the gray shape never escapes, so it has nothing to record.

Then press **Test 100 million numbers**. Each number that escapes adds its faint dots, and a picture fades in over a few seconds.

<figure data-investigation="buddhabrot"></figure>

## Long routes start on the edge

Bright pixels were visited often. The picture has a soft cloud and thin, sharp lines. To see which routes make which, sort them by length.

Press **Up to 20 steps**. These are 89% of the numbers, and they make only the cloud. Press **201 to 2,000 steps**. Only one number in 900 takes that long, yet those routes lay down a quarter of all the dots. The cloud is gone and the lines remain.

Watch the left picture as you switch. It shows where each group starts. Short routes start anywhere well outside the gray shape. Long routes start in a thin line around its edge.<sup><a id="buddhabrot-ref-2" href="#buddhabrot-source-2">2</a></sup> Of those long routes, 99% start within $0.01$ of a number that never escapes. Almost none of the short routes do.<sup><a id="buddhabrot-ref-3" href="#buddhabrot-source-3">3</a></sup> Move just outside the gray shape and the step count climbs into the tens or hundreds.

## One outline, bent again and again

This picture follows the long routes together, one step at a time.<sup><a id="buddhabrot-ref-4" href="#buddhabrot-source-4">4</a></sup>

<figure data-investigation="buddhabrot-outline"></figure>

The first step of a route lands on its own number, because $0^2$ plus the number is the number. So step 1 draws the outline of the gray shape.

At step 2, each dot moves to its position squared plus its number, and the whole outline bends. Take the round bulb at the top, centered on $-1$. Since $(-1)^2+(-1)=0$, it lands around $0$, inside the big round body. On step 3, $0^2+(-1)=-1$, and it hops back, bent into a heart. Click through the steps and watch it hop.

Each later step bends the outline again. By step 20 it has become a tangle of thin curves in the shape of the finished picture.

Those 20 steps hold only 4% of a long route's dots. The rest come later, as the route keeps returning to its own number.<sup><a id="buddhabrot-ref-10" href="#buddhabrot-source-2">2</a></sup> About one step in ten lands within $0.05$ of it. A route spread evenly over the circle of radius 2 would do that once in 1,600 steps. From there, its next steps land close to its first steps, so it draws the same bent outlines again.<sup><a id="buddhabrot-ref-5" href="#buddhabrot-source-5">5</a></sup> Compare step 2 with **Every step**: the oval and the circle in the middle are still there.

The full explorer's **Fractal Studio Controls** choose the same groups with **Maximum iterations** and **Minimum orbit length**. It opens with a maximum of 20, which shows the cloud. Set the maximum to 2,000 and the minimum to 201 for the long routes.

Melinda Green developed this method in 1993. Lori Gardi later supplied the name.<sup><a id="buddhabrot-ref-6" href="#buddhabrot-source-1">1</a></sup>

## A branching diagram inside

What happens if we keep the routes that don't escape? This is the **Anti-Buddhabrot** idea. Green found a connection to the [logistic map](/logistic-map) by changing which coordinates she plotted.<sup><a id="buddhabrot-ref-7" href="#buddhabrot-source-6">6</a></sup>

The next picture puts these routes into a three-dimensional cloud. Each later answer becomes a dot. Two coordinates place it at the chosen number in the Mandelbrot picture. Its depth comes from the answer's horizontal coordinate.

Seen from the front, all those answers overlap at the number that produced them. Turn the cloud sideways to separate them. Press **Play turn** and follow the amber dots.

<figure data-investigation="buddhabrot-connection"></figure>

At a quarter turn, only the amber slice remains: numbers chosen along the Mandelbrot picture's horizontal center line.<sup><a id="buddhabrot-ref-8" href="#buddhabrot-source-7">7</a></sup> Each column now shows the answers one calculation keeps approaching. One answer makes one branch; an alternating pair makes two.

Choose **Logistic map**. The same dots move to that map's usual coordinates, with branches splitting toward the right. This view covers its growth values from $1$ to $4$.

The two calculations are connected by a change of coordinates. Writing the logistic rule as $x_{n+1}=rx_n(1-x_n)$, set

$$
z=r\left(\frac12-x\right),\qquad c=\frac{r(2-r)}4.
$$

The rule becomes $z_{n+1}=z_n^2+c$, the square-and-add calculation we began with. Starting at $x=\frac12$ in one is starting at $z=0$ in the other.<sup><a id="buddhabrot-ref-9" href="#buddhabrot-source-8">8</a></sup>

## Further exploring

- [Buddhabrot — Wikipedia](https://en.wikipedia.org/wiki/Buddhabrot)
- [Buddhabrot — MathWorld](https://mathworld.wolfram.com/Buddhabrot.html)
- [Rendering a Buddhabrot at 4K and Other Bad Ideas — Benedikt Bitterli](https://benedikt-bitterli.me/buddhabrot/)
- [The Buddhabrot — Paul Bourke](https://paulbourke.net/fractals/buddhabrot/)

## Sources and notes

1. <span id="buddhabrot-source-1"></span> [The Buddhabrot Technique](https://superliminal.com/fractals/bbrot/) [Back](#buddhabrot-ref-1) [Back](#buddhabrot-ref-6)
2. <span id="buddhabrot-source-2"></span> [Buddhabrot — Mu-Ency](https://mrob.com/pub/muency/buddhabrot.html) [Back](#buddhabrot-ref-2) [Back](#buddhabrot-ref-10)
3. <span id="buddhabrot-source-3"></span> **Calculation.** A route's length is the step on which it leaves the circle of radius 2. That last position is not recorded. The figure tests random numbers in mirror-image pairs, because a number's mirror image has the mirrored route. It waits up to 2,000 steps, so "never escapes" means staying that long. Of 100,000,000 numbers, 89.2% have routes of up to 20 steps and 110,588 have routes of 201 steps or more, which hold 26% of the visits inside the picture. For the distance, points on circles around 1,500 numbers from each group were tested: 99.3% of the long routes and none of the short routes have a number within $0.01$ that never escapes. [Back](#buddhabrot-ref-3)
4. <span id="buddhabrot-source-4"></span> **Diagram construction.** To save time, this figure tests only numbers in small squares near the edge. These are 3.4% of the squares and hold 99.6% of the long routes. It keeps 60,000 numbers and their mirror images. Each picture is brightened on its own, because one step holds far fewer dots than all of them. [Back](#buddhabrot-ref-4)
5. <span id="buddhabrot-source-5"></span> **Calculation.** From 6,000 long routes, the first 20 steps hold 3.9% of the dots. After step 1, 10.0% of steps land within $0.05$ of the route's own number. A disk of radius $0.05$ has $1/1600$ of the area of the circle of radius 2. From 2,000 of those routes, after such a return, each of the next six steps lands a median of $0.03$ to $0.05$ from the route's matching early step. Dots after step 11 land within $0.01$ of the route's own first six positions 9.5% of the time, and within $0.01$ of another long route's first six positions 0.16% of the time. [Back](#buddhabrot-ref-5)
6. <span id="buddhabrot-source-6"></span> [The Logistic Connection](https://superliminal.com/fractals/bbrot/l-map/) [Back](#buddhabrot-ref-7)
7. <span id="buddhabrot-source-7"></span> **Diagram construction.** All routes start at zero. The figure tests 864 steps, omits the first 768, and plots later positions from routes that pass the test. This finite test approximates nonescape. The real slice uses 1,100 parameters strictly between −2 and ¼. The front view plots parameter coordinates, rather than the orbit coordinates of a standard Anti-Buddhabrot. [Back](#buddhabrot-ref-8)
8. <span id="buddhabrot-source-8"></span> [Math 5260 Dynamical Systems](https://www.d.umn.edu/~bpeckham/5260/F2001/Math5260F2001.html) (Homework Set 5, problem 9). [Back](#buddhabrot-ref-9)
