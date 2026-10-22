# Logistic Map

Look for vertical columns that split from one band into two, then into more bands. Each column follows the same rule with a different parameter:

$$
x_{n+1} = r x_n (1 - x_n)
$$

## Follow one column's rule

Choose a starting value between zero and one. Multiply it by $r$ and by one minus itself. Feed the result back into the same calculation.

<figure data-lesson="logistic"></figure>

For $0 \leq r \leq 4$, this rule keeps a starting value in $[0,1]$ inside that interval. Different values of $r$ can produce a stable value, an alternating cycle, or an irregular sequence. Periodic windows also occur between irregular regions. Increasing $r$ does not make every trace chaotic.

## Build the bifurcation image

The full explorer starts each column at $x_0 = 0.5$. It discards some early iterations, then plots the later values at that column's $r$. A sequence that approaches two alternating values leaves two bands. Many later values spread through a column when the sequence does not approach a short cycle.

Open **Fractal Studio Controls** and choose **Starting view → Early bifurcations** to inspect the first splits. **Settle steps** controls how many early values the renderer discards. **Plotted steps** controls how many later values it draws. A finite sample can still contain transients or miss part of a pattern.

Drag to pan. Hold **Shift** while dragging up or down to zoom. Compare **Chaotic bands** with **Feigenbaum window** under **Starting view** to inspect different regions.

The logistic map repeats a rule on real numbers. The [Julia set](/julia-set) and [Mandelbrot set](/mandelbrot) repeat rules on complex numbers. The [Lorenz attractor](/lorenz-attractor) follows a continuous flow through three-dimensional space instead of a discrete recurrence.
