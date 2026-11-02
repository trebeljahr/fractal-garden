# Logistic Map

Start with $0.5$. Multiply it by $1-0.5$, then by $2.8$. The answer is $0.7$.

Do the same with that answer: $2.8\times0.7\times(1-0.7)=0.588$. Repeat and the answers swing back and forth, getting closer to about $0.643$. At that value, the calculation gives almost the same number back.<sup><a id="logistic-map-ref-1" href="#logistic-map-source-1">1</a></sup>

The number $2.8$ controls the calculation. We call it $r$. Below, try changing it to $3.2$ with **Alternating**. Do the answers still settle toward one number?

<figure data-lesson="logistic"></figure>

With $r=3.2$, the answers approach a pair and alternate between them. Increase $r$ further and that pair splits into four values, then eight. The rule stays the same:

$$
\text{next number}=r\times\text{current number}\times(1-\text{current number}).
$$

The large branching picture puts many of these experiments side by side. Each column uses one value of $r$. We leave out the early answers and plot the later ones. One lasting value makes one branch; an alternating pair makes two.

After enough splits, many settings produce **chaos**: nearby starting numbers eventually give very different answers. Repeating patterns still appear among them. Near $r=3.83$, the answers settle into a three-number cycle.<sup><a id="logistic-map-ref-2" href="#logistic-map-source-1">1</a>, <a id="logistic-map-ref-3" href="#logistic-map-source-2">2</a></sup>

Near a split, answers can take a long time to settle. The picture may still include some of those early values.

## Further exploring

### Videos

- [This equation will change how you see the world — Veritasium](https://www.youtube.com/watch?v=ovJcsL7vyrk)
- [The Feigenbaum Constant — Numberphile](https://www.youtube.com/watch?v=ETrYE4MdoLQ)

### Reading

- [Logistic map — Wikipedia](https://en.wikipedia.org/wiki/Logistic_map)
- [Logistic map — MathWorld](https://mathworld.wolfram.com/LogisticMap.html)
- [Chaos Theory and the Logistic Map — Geoff Boeing](https://geoffboeing.com/2015/03/chaos-theory-logistic-map/)
- [Logistic Equation — Paul Bourke](https://paulbourke.net/fractals/logistic/)

## Sources and notes

1. <span id="logistic-map-source-1"></span> [Simple Mathematical Models with Very Complicated Dynamics — Dynamic Properties](https://ned.ipac.caltech.edu/level5/Sept01/May/May3.html). [Back](#logistic-map-ref-1) [Back](#logistic-map-ref-2)
2. <span id="logistic-map-source-2"></span> [Fine Structure of the Chaotic Regime](https://ned.ipac.caltech.edu/level5/Sept01/May/May4.html). [Back](#logistic-map-ref-3)
