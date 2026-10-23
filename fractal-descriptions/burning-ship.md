# Burning Ship Fractal

Zoom into the Burning Ship fractal to find smaller ships and rows of thin towers. Its main outline resembles a hull with masts above it. The colored bands trace the edges, where the towers split into finer detail.

Smaller ships repeat the hull-and-mast arrangement along the boundary. Their surrounding towers differ, even when their broad outlines resemble the whole.

## A fold changes the boundary

The absolute-value operation identifies points from different quadrants before the next square. It erases sign differences that the Mandelbrot rule preserves.

That folding changes the arrangement of filaments and towers. Near a small ship, thin ridges split again into finer ridges.

The bright bands record escape behavior. Their colors are a choice of display, while their locations come from the iterated rule.

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

The dashed amber line below marks the fold before squaring and addition. The plot uses the usual upward imaginary axis.

<figure data-orbit="burning-ship"></figure>

The set contains the values of $c$ whose sequences stay bounded forever. Default coloring uses smooth escape time for the points that escape. Black marks points that do not escape within the current **Iterations** limit.

Some boundary points escape only after a long delay. A finite calculation can leave them dark alongside points with bounded orbits.

For another view of the same escape-time idea, the [Julia set explorer](/julia-set) fixes $c$ and varies the starting point.

### Long delays near the edge

A fold can bring an orbit back toward an axis before the square sends it away again. Repeated returns produce long escape delays.

Escape-time bands distinguish those delays. A darker band need not belong to the set.

The mathematical set requires boundedness forever. Every finite rendering approximates that condition.
