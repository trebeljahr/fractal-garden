# Burning Ship Fractal

Each pixel supplies a complex parameter $c$. Start from zero, make both coordinates nonnegative, square the result, then add $c$:

$$
z_0=0,\qquad z_{n+1}=\left(|\operatorname{Re}(z_n)|+i|\operatorname{Im}(z_n)|\right)^2+c.
$$

For $z_n=x_n+iy_n$ and $c=a+ib$, this becomes

$$
x_{n+1}=x_n^2-y_n^2+a,\qquad y_{n+1}=2|x_ny_n|+b.
$$

The absolute values fold four quadrants together before each square. They preserve the real part of the square and force its imaginary contribution nonnegative.

<figure data-article-images="burning-ship"></figure>

Michael Michelitsch and Otto Rössler introduced the Burning Ship in 1992. Their paper also studied its fixed-parameter relatives, which they called quasi-Julia sets.<sup><a id="burning-ship-ref-1" href="#burning-ship-source-1">1</a></sup> The fold makes this map non-analytic: complex differentiation no longer describes the whole rule.

The explorer displays the imaginary axis downward, the usual Burning Ship convention. That orientation gives the main shape its hull and rising masts. The orbit diagram below uses the usual upward imaginary axis.

<figure data-orbit="burning-ship"></figure>

Small ships relate to periodic returns of the orbit. Researchers can locate their centers numerically by solving for a return to zero. Claude Heiland-Allen's 2019 paper develops this method using a real Jacobian matrix, which tracks changes in both coordinates.<sup><a id="burning-ship-ref-2" href="#burning-ship-source-2">2</a></sup>

The mathematical set contains parameters whose orbits remain bounded forever. **Smooth escape time** colors escaping orbits. Black means no escape within the chosen iteration limit, which can include slowly escaping parameters.

The [Mandelbrot set](/mandelbrot) uses the same square-and-add operation without the fold. The [Julia explorer](/julia-set) instead fixes its parameter and varies the starting point.

## Sources and notes

1. <span id="burning-ship-source-1"></span> Michael Michelitsch and Otto E. Rössler, [The “burning ship” and its quasi-Julia sets](https://www.sciencedirect.com/science/article/pii/009784939290032Q), *Computers & Graphics* 16(4) (1992), 435–438. Original paper's public abstract confirms the nonanalytic construction and quasi-Julia family. [Back](#burning-ship-ref-1)
2. <span id="burning-ship-source-2"></span> Claude Heiland-Allen, [At the Helm of the Burning Ship](https://mathr.co.uk/helm/AtTheHelmOfTheBurningShip-Paper.pdf), *Electronic Visualisation and the Arts* (2019), 402–408. Gives the real-coordinate recurrence, axis convention, periodic mini-ships and Jacobian methods. [Back](#burning-ship-ref-2)
