# Burning Ship Fractal

Zoom into the Burning Ship fractal to find smaller ships and rows of thin towers. Its main outline resembles a hull with masts above it. The colored bands trace the edges, where the towers split into finer detail.

This interactive explorer starts with the whole ship in view. Look toward its left end for smaller ship shapes, or use **Little ship** to visit one directly.

## Explore the smaller ships

Drag to pan, then use the scroll wheel to zoom toward the pointer. On a touch screen, drag with one finger and pinch with two fingers to zoom.

Open **Places to explore** and choose **Little ship**. Follow the edge around its masts. Repeated towers appear side by side at different scales. **Whole ship** returns to the starting view.

Open **Fractal Studio Controls** and choose **Inferno** for a red and yellow view. The flame colors come from the palette. Try **Iteration bands** to see the escape steps, or change **Palette** while you stay at the same location.

<figure data-article-images="burning-ship"></figure>

## How it relates to Mandelbrot

The [Mandelbrot set](/mandelbrot) has round bulbs and curled branches. Burning Ship uses almost the same rule, with one change. Before each square, it makes both parts of the complex number positive or zero.

This folds all four quadrants into one before the next step. Smaller ships echo the main outline, with different arrangements of towers around them.

The explorer displays the imaginary axis downward so the hull and masts appear upright.

## The rule and the colors

Each pixel supplies a complex number $c$. The [Burning Ship rule](https://mathr.co.uk/helm/AtTheHelmOfTheBurningShip-Paper.pdf) starts from zero:

$$
z_0 = 0, \qquad z_{n+1} = \left(|\operatorname{Re}(z_n)| + i|\operatorname{Im}(z_n)|\right)^2 + c
$$

The absolute values act on the real and imaginary parts separately. They leave the squared real terms unchanged, but make their product nonnegative in the imaginary part.

Step through an orbit below. The dashed amber line shows the fold before the square and addition. This teaching plot uses the usual upward imaginary axis, so you can follow the signs directly.

<figure data-orbit="burning-ship"></figure>

The set contains the values of $c$ whose sequences stay bounded forever. Default coloring uses smooth escape time for the points that escape. Black marks points that do not escape within the current **Iterations** limit.

Increase **Iterations** when a dark patch near the edge needs a longer test. More steps refine the image but take more drawing time. Changing the colors does not change the rule.

For another view of the same escape-time idea, the [Julia set explorer](/julia-set) fixes $c$ and varies the starting point.

### Zooming deeper

The explorer keeps more coordinate digits as you zoom. It calculates a precise reference path, then uses the GPU to draw nearby points.

At deeper zooms, a quick preview keeps the image moving while you drag or zoom. Detail returns when you pause. Difficult regions can take longer to refine.

This version supports magnification up to about $10^{4932}$, with an 8,192-step iteration budget. Those are practical limits, so it cannot promise endless detail or a fixed frame rate. Follow a boundary: a solid interior or exterior region stays solid when magnified.
