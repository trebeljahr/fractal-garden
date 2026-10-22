# Mandelbrot Set

Zoom into the Mandelbrot set to find spirals, branching edges and smaller versions of its familiar outline. This interactive explorer lets you follow those patterns and change how the colors reveal them.

The large black shape has a heart-shaped body and a round bulb on its left. More bulbs and thin branches line its edge. The colored bands surround that edge, where nearby points can behave very differently.

<figure data-article-images="mandelbrot"></figure>

## What to try

Drag the image to pan. Use the scroll wheel to zoom toward the pointer, or pinch with two fingers on a touch screen.

Start in the narrow gap between the main body and the round bulb. Follow a curled edge into the region often called Seahorse Valley. Elsewhere along the boundary, look for smaller Mandelbrot shapes among the branches.

Open **Fractal Studio Controls** and try **Iteration bands** to see steps in the escape time. Switch to **Stripes** or **Orbit trap** to reveal different patterns at the same location. Change **Palette** to compare colors without changing the fractal.

## Bulbs, cycles and smaller copies

Inside the heart-shaped body, repeated calculations settle toward one value. Inside the round bulb, they settle into a two-step cycle. Other bulbs contain longer [repeating cycles](https://complexanalysis.org/web/sec_julia-mandelbrot.html).

Smaller Mandelbrot shapes repeat this organization, with their own bulbs and surrounding branches. Their surrounding detail varies, so different zooms reveal different arrangements of curls.

## What the colors mean

With the default **Smooth escape time** coloring, the colors describe how quickly a point's sequence grows beyond the escape radius. Smooth coloring blends the steps between whole iteration counts. **Orbit trap** uses a different measurement: how close the sequence comes to the origin.

Black marks points that do not escape within the current **Iterations** limit. Some points near the boundary need more steps before they escape. Increase **Iterations** to refine the image there, at the cost of more drawing time. The explorer also limits how far you can zoom.

## The rule behind the image

Each pixel supplies a complex number $c$. Start at zero, then repeatedly square the result and add $c$:

$$
z_0 = 0, \qquad z_{n+1} = z_n^2 + c
$$

For $c = 0$, the sequence stays at zero. For $c = 1$, it starts $0, 1, 2, 5, 26$ and grows without bound. The Mandelbrot set contains the values of $c$ whose sequences stay bounded forever. A finite image approximates that test.

Try those values below. At $c = -1$, the orbit alternates between zero and minus one. The plot follows the calculated values, rather than the pixel's position in the Mandelbrot image.

<figure data-orbit="mandelbrot"></figure>

The [Julia set explorer](/julia-set) keeps $c$ fixed and varies the starting point instead. The [Burning Ship](/burning-ship) changes the rule by taking absolute values before each square.
