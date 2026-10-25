# Logistic Map

Take a number between zero and one. Multiply it by one minus itself, then multiply by a control value $r$. Use the answer as the next number and repeat:

$$
x_{n+1}=rx_n(1-x_n).
$$

For $r=2$, starting at $0.2$ gives $0.32$, then $0.4352$, then about $0.492$. The answers approach $0.5$. Putting $0.5$ into the rule gives $0.5$ again.<sup><a id="logistic-map-ref-1" href="#logistic-map-source-1">1</a></sup>

<figure data-lesson="logistic"></figure>

The large picture repeats this experiment for many values of $r$. Each vertical column uses one value. It skips some early answers, then plots the later ones.

Where the answers settle toward one value, the column has one band. Where they alternate between two values, it has two bands. Raise $r$ past the next split and the repeating cycle has four values, then eight.

These doublings accumulate near $r=3.57$. Many settings beyond that produce chaos: nearby starting numbers eventually give very different sequences. Repeating cycles still return in some intervals. Near $r=3.83$, the rule settles into a three-value cycle.<sup><a id="logistic-map-ref-2" href="#logistic-map-source-2">2</a></sup>

The branches in the picture show these lasting cycles. A limited calculation can also include values that have not settled yet, especially near a split.

## Further reading

- [Logistic map — Wikipedia](https://en.wikipedia.org/wiki/Logistic_map)
- [Logistic map — MathWorld](https://mathworld.wolfram.com/LogisticMap.html)

## Sources and notes

1. <span id="logistic-map-source-1"></span> Robert M. May, [Simple Mathematical Models with Very Complicated Dynamics](https://ned.ipac.caltech.edu/level5/Sept01/May/May_contents.html), *Nature* 261 (1976), 459–467. Original review, reproduced by Caltech's NASA/IPAC Extragalactic Database. [Back](#logistic-map-ref-1)
2. <span id="logistic-map-source-2"></span> May, [section 3](https://ned.ipac.caltech.edu/level5/Sept01/May/May3.html) and [section 4](https://ned.ipac.caltech.edu/level5/Sept01/May/May4.html). Gives stability tests, period doubling, and the three-cycle window. [Back](#logistic-map-ref-2)
