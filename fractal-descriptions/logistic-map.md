# Logistic Map

One number settles down. Turn a control, and it starts bouncing between two values. Turn it farther: four values, then eight, then a pattern that stops repeating.

All of that comes from one rule:

$$
x_{n+1}=rx_n(1-x_n).
$$

Take the current number $x$. Multiply it by $1-x$, then by the control value $r$. Use the result as your next $x$ and repeat.<sup><a id="logistic-map-ref-1" href="#logistic-map-source-1">1</a></sup>

<figure data-lesson="logistic"></figure>

Try $r=2$ and start at $x=0.2$. The next values are $0.32$, $0.4352$, then about $0.492$. They approach $0.5$. Substituting $0.5$ gives $0.5$ again, so the number stays there.

## Where do the branches come from?

Each vertical slice of the big picture uses one value of $r$. The explorer starts at $0.5$, waits through some early steps, then plots later values.

One lasting value makes one band. Two alternating values make two bands. Each split marks another doubling of the repeating pattern.

Beyond about $r=3.57$, many settings give chaotic behavior. But repeating patterns return in pockets. Near $r=3.83$, the numbers settle into a cycle of three.<sup><a id="logistic-map-ref-2" href="#logistic-map-source-2">2</a></sup>

This rule also connects to the [Mandelbrot set](/mandelbrot). Change coordinates with $z=r/2-rx$ and it becomes the same square-and-add rule, with $c=r(2-r)/4$. The branch diagram and the Mandelbrot picture share that mathematics.

## Sources and notes

1. <span id="logistic-map-source-1"></span> Robert M. May, [Simple Mathematical Models with Very Complicated Dynamics](https://ned.ipac.caltech.edu/level5/Sept01/May/May_contents.html), *Nature* 261 (1976), 459–467. Original review, reproduced by Caltech's NASA/IPAC Extragalactic Database. [Back](#logistic-map-ref-1)
2. <span id="logistic-map-source-2"></span> May, [section 3](https://ned.ipac.caltech.edu/level5/Sept01/May/May3.html) and [section 4](https://ned.ipac.caltech.edu/level5/Sept01/May/May4.html). Gives stability tests, period doubling, and the three-cycle window. The example at r = 2 and the change of coordinates follow directly from the rule shown here. [Back](#logistic-map-ref-2)
