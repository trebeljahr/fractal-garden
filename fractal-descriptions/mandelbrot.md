# Mandelbrot Set

Zoom into the Mandelbrot set to find spirals, branching edges and smaller versions of its familiar outline. This interactive explorer lets you follow those patterns and change how the colors reveal them.

The large black shape has a heart-shaped body and a round bulb on its left. More bulbs and thin branches line its edge. The colored bands surround that edge, where nearby points can behave very differently.

<figure data-article-images="mandelbrot"></figure>

## Repetition near the boundary

A boundary separates parameters with bounded orbits from parameters whose orbits escape. Nearby parameters can behave alike for many iterations before separating.

Seahorse Valley lies near the junction of the main cardioid and the period-two bulb. Spirals and branching filaments collect around this narrow region.

Smaller Mandelbrot copies carry their own bulbs, but their surrounding filaments differ. Repetition here does not mean every neighborhood is an exact scaled copy.

## Bulbs, cycles and smaller copies

Inside the heart-shaped body, repeated calculations settle toward one value. Inside the round bulb, they settle into a two-step cycle. Other bulbs contain longer [repeating cycles](https://complexanalysis.org/web/sec_julia-mandelbrot.html).

Smaller Mandelbrot shapes repeat this organization, with their own bulbs and surrounding branches. Their surrounding detail varies, so different zooms reveal different arrangements of curls.

## What the colors mean

With the default **Smooth escape time** coloring, the colors describe how quickly a point's sequence grows beyond the escape radius. Smooth coloring blends the steps between whole iteration counts. **Orbit trap** uses a different measurement: how close the sequence comes to the origin.

Black marks points that do not escape within the current **Iterations** limit. Some points near the boundary need more steps before they escape. The iteration count grows as you zoom. Raise **Minimum iterations** to add more detail, up to 8,192 steps per pixel.

## The rule behind the image

Each pixel supplies a complex number $c$. Start at zero, then repeatedly square the result and add $c$:

$$
z_0 = 0, \qquad z_{n+1} = z_n^2 + c
$$

For $c = 0$, the sequence stays at zero. For $c = 1$, it starts $0, 1, 2, 5, 26$ and grows without bound. The Mandelbrot set contains the values of $c$ whose sequences stay bounded forever. A finite image approximates that test.

At $c=-1$, the orbit alternates between zero and minus one. The plot below shows orbit positions in the complex plane.

<figure data-orbit="mandelbrot"></figure>

The [Julia set explorer](/julia-set) keeps $c$ fixed and varies the starting point instead. The [Burning Ship](/burning-ship) changes the rule by taking absolute values before each square.

### Why a boundary can stay dark

A parameter can remain near a repeating cycle for many iterations before escaping. Its finite escape test can therefore resemble a bounded orbit.

An escape radius gives a one-way test: once an orbit crosses it under the quadratic rule, the orbit must escape.

Staying below that radius for a finite number of steps does not prove membership. More iterations resolve some of these uncertain boundary points.
