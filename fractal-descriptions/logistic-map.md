# Logistic Map

Start with $0.5$. Multiply it by $1-0.5$, then by $2.8$. The answer is $0.7$.

Do the same with that answer: $2.8\times0.7\times(1-0.7)=0.588$. Repeat and the answers swing back and forth, getting closer to about $0.643$. At that value, the calculation gives almost the same number back.<sup><a id="logistic-map-ref-1" href="#logistic-map-source-1">1</a></sup>

The number $2.8$ controls the calculation. We call it $r$. The rule stays the same:

$$
\text{next number}=r\times\text{current number}\times(1-\text{current number}).
$$

The chart below shows the first answers. Under it, the marked step is worked out by hand.

<figure data-lesson="logistic"></figure>

Try $r=3.2$. The answers no longer settle on one number. They approach a pair and alternate between them. With $r=3.5$ there are four. With $r=3.9$ this short list shows no repeat.

The change at $r=3$ has a cause. Near the settling number, each step multiplies the gap by $2-r$.<sup><a id="logistic-map-ref-2" href="#logistic-map-source-2">2</a></sup> With $r=2.8$ that is $-0.8$: the answer changes sides and the gap shrinks, which is the swing you saw. With $r=3$ it is $-1$: the gap keeps its size. Past $3$ the gap grows, so the answers can't settle on one number.

Now give each $r$ a column. Run the calculation, leave out the first 2,000 answers, and mark the next 300. One lasting number makes one mark and a pair makes two. Move your pointer across the picture below, or drag on a phone.

<figure data-lesson="logistic-columns"></figure>

Press **Fill the rest**. This is the branching picture from the top of this page, with its columns spaced to line up with the strip above it.

That strip is the [Mandelbrot set](/mandelbrot), flipped left to right. They line up because they are one calculation with different names. Set $c=r(2-r)/4$ and $z=r(\tfrac12-x)$. The rule becomes $z^2+c$, and starting at $0.5$ becomes starting at $0$.<sup><a id="logistic-map-ref-3" href="#logistic-map-source-3">3</a></sup> The [Buddhabrot](/buddhabrot) article turns one picture into the other.

So each $r$ repeats exactly as long as its $c$ does. One branch sits under the heart. The first split, at $r=3$, is $c=-3/4$, the neck where the heart meets the round bulb. Two branches sit under that bulb, whose numbers repeat in pairs. The next split, at $r=1+\sqrt6$, is $c=-5/4$, the next joint along.<sup><a id="logistic-map-ref-4" href="#logistic-map-source-4">4</a></sup>

Far to the right, among answers with no visible repeat, a clear gap opens with three branches. It starts at $r=1+\sqrt8$, about $3.83$.<sup><a id="logistic-map-ref-5" href="#logistic-map-source-1">1</a>, <a id="logistic-map-ref-6" href="#logistic-map-source-5">5</a></sup> That is $c=-7/4$, where a small copy of the Mandelbrot set sits on its long thin antenna.

Go back to the chart, choose $r=3.9$ and press **Second start**. The two starts differ by $0.001$, and by step 20 they are far apart. With $r=3.2$ they join up. This is **chaos**: nearby starting numbers eventually give very different answers.<sup><a id="logistic-map-ref-7" href="#logistic-map-source-1">1</a></sup>

Near a split, answers can take a long time to settle, so those columns may still show early values.

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

1. <span id="logistic-map-source-1"></span> [Simple Mathematical Models with Very Complicated Dynamics — Dynamic Properties](https://ned.ipac.caltech.edu/level5/Sept01/May/May3.html). [Back](#logistic-map-ref-1) [Back](#logistic-map-ref-5) [Back](#logistic-map-ref-7)
2. <span id="logistic-map-source-2"></span> Calculation: the settling number is $x=1-1/r$. The slope of $rx(1-x)$ there is $r(1-2x)=2-r$. [Back](#logistic-map-ref-2)
3. <span id="logistic-map-source-3"></span> Calculation: substitute $x=\tfrac12-z/r$ into $rx(1-x)$. [Back](#logistic-map-ref-3)
4. <span id="logistic-map-source-4"></span> [Mandelbrot set](https://en.wikipedia.org/wiki/Mandelbrot_set): the round bulb is a disk of radius $1/4$ around $-1$, attached at $-3/4$, so its far end is $-5/4$. [Back](#logistic-map-ref-4)
5. <span id="logistic-map-source-5"></span> [Fine Structure of the Chaotic Regime](https://ned.ipac.caltech.edu/level5/Sept01/May/May4.html). [Back](#logistic-map-ref-6)
