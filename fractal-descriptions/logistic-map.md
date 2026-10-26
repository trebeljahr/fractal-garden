# Logistic Map

Take a number between zero and one. Multiply it by one minus itself, then multiply by a control value $r$. Use the answer as the next number and repeat:

$$
x_{n+1}=rx_n(1-x_n).
$$

The example below starts at $0.5$ with $r=2.8$. Its first answers are $0.7$, then $0.588$, then about $0.678$. They approach about $0.643$. Putting that value into the rule gives nearly the same answer again.<sup><a id="logistic-map-ref-1" href="#logistic-map-source-1">1</a></sup>

In the left graph, go up to the curve to find the next answer. Go across to the diagonal to use that answer as the next input. The right graph plots the same answers in order. Try **Two-cycle** to see them approach an alternating pair.

<figure data-lesson="logistic"></figure>

The large picture repeats this experiment for many values of $r$. Each vertical column uses one value. It skips some early answers, then plots the later ones.

Where the answers settle toward one value, the column has one band. Where they alternate between two values, it has two bands. Raise $r$ past the next split and the repeating cycle has four values, then eight.

These doublings accumulate near $r=3.57$. Many settings beyond that produce chaos: nearby starting numbers eventually give very different sequences. Repeating cycles still return in some intervals. Near $r=3.83$, the rule settles into a three-value cycle.<sup><a id="logistic-map-ref-2" href="#logistic-map-source-2">2</a></sup>

The branches in the picture show these lasting cycles. A limited calculation can also include values that have not settled yet, especially near a split.

## Further reading

- [Logistic map — Wikipedia](https://en.wikipedia.org/wiki/Logistic_map)
- [Logistic map — MathWorld](https://mathworld.wolfram.com/LogisticMap.html)

## Sources and notes

1. <span id="logistic-map-source-1"></span> [Simple Mathematical Models with Very Complicated Dynamics — Dynamic Properties](https://ned.ipac.caltech.edu/level5/Sept01/May/May3.html). [Back](#logistic-map-ref-1)
2. <span id="logistic-map-source-2"></span> [Simple Mathematical Models with Very Complicated Dynamics — Dynamic Properties](https://ned.ipac.caltech.edu/level5/Sept01/May/May3.html) and [Fine Structure of the Chaotic Regime](https://ned.ipac.caltech.edu/level5/Sept01/May/May4.html). [Back](#logistic-map-ref-2)
