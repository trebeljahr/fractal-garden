# Logistic Map

For each value of $r$, choose a starting value and repeat

$$
x_{n+1}=rx_n(1-x_n).
$$

The same one-variable rule can approach a fixed point, alternate between several values, or produce aperiodic behavior. Robert May's 1976 review brought these possibilities to a wide scientific audience.<sup><a id="logistic-map-ref-1" href="#logistic-map-source-1">1</a></sup>

<figure data-lesson="logistic"></figure>

For $0\leq r\leq4$, the interval $[0,1]$ maps into itself. This follows directly from $0\leq x(1-x)\leq1/4$ there.

For $r>0$, the fixed points also follow by substitution:

$$
x^*=0,\qquad x^*=1-\frac1r.
$$

At the second fixed point, the derivative is $2-r$. Its magnitude is below one for $1<r<3$, so small deviations shrink. At $r=3$, that fixed point loses stability and a two-cycle appears. Further increases produce four-cycles, eight-cycles, and a period-doubling cascade.

The cascade accumulates near $r=3.57$. Periodic windows interrupt the chaotic region beyond it. Near $r=3.83$, a stable three-cycle appears and begins its own sequence of doublings.<sup><a id="logistic-map-ref-2" href="#logistic-map-source-2">2</a></sup>

The explorer builds one vertical column per parameter. It starts at $x_0=0.5$, discards early iterates, then plots later values. Two lasting values make two bands. A finite sample can also include transients, especially near a bifurcation.

An algebraic change of coordinates connects this diagram to the [Mandelbrot set](/mandelbrot). Put $z_n=r/2-rx_n$. Direct substitution gives

$$
z_{n+1}=z_n^2+c,\qquad c=\frac{r(2-r)}4.
$$

Thus the real logistic family traces real parameters of the quadratic complex family. Its seed $x_0=0.5$ becomes the critical seed $z_0=0$.

## Sources and notes

1. <span id="logistic-map-source-1"></span> Robert M. May, [Simple Mathematical Models with Very Complicated Dynamics](https://ned.ipac.caltech.edu/level5/Sept01/May/May_contents.html), *Nature* 261 (1976), 459–467. Original review, reproduced by Caltech's NASA/IPAC Extragalactic Database. [Back](#logistic-map-ref-1)
2. <span id="logistic-map-source-2"></span> May, [section 3](https://ned.ipac.caltech.edu/level5/Sept01/May/May3.html) and [section 4](https://ned.ipac.caltech.edu/level5/Sept01/May/May4.html). Gives stability tests, period doubling, and the three-cycle window. The interval bound, fixed points and quadratic coordinate change above are direct derivations. [Back](#logistic-map-ref-2)
