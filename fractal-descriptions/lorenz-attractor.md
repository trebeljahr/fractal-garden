# Lorenz Attractor

The Lorenz attractor follows three numbers, $x$, $y$ and $z$, as they change over time:

$$
\begin{aligned}
\frac{dx}{dt}&=10(y-x)\\
\frac{dy}{dt}&=x(28-z)-y\\
\frac{dz}{dt}&=xy-\tfrac83z
\end{aligned}
$$

Each left side says how fast that number is changing at this moment, and each right side uses the current numbers, so each number affects how the other two change. Used as coordinates, the three numbers give a point, and the point's trail circles one wing, then crosses to the other.

Turn on **Compare a nearby start** below. The second calculation, drawn dashed, begins just $0.001$ away in one coordinate and follows exactly the same rules, so watch for the moment the two stop following the same wing. The **x–z view** shows the wings from the side and the **x–y view** looks down on them, so one view can show a gap the other hides.

<figure data-lesson="lorenz"></figure>

A tiny difference at the start can lead to a large difference later, which is called **sensitivity to starting conditions**. The points can move closer again, too, since their distance does not grow at every step.

Edward Lorenz found this by accident. He was running a weather model on his computer and wanted to see part of a run again, so he typed in a line of numbers from an earlier printout, restarted the run and went for coffee. About an hour later it had simulated about two months of weather, and the new numbers were nothing like the old ones.<sup><a id="lorenz-attractor-ref-1" href="#lorenz-attractor-source-1">1</a></sup>

The printout rounded to three decimal places, and the computer kept more.<sup><a id="lorenz-attractor-ref-2" href="#lorenz-attractor-source-1">1</a></sup> One retelling gives an example: the computer held $0.506127$ and the printout showed $0.506$.<sup><a id="lorenz-attractor-ref-3" href="#lorenz-attractor-source-2">2</a></sup>

That weather model had 12 variables, so it is not the system on this page. Lorenz later looked for the simplest equations that behave this way and arrived at the three above.<sup><a id="lorenz-attractor-ref-4" href="#lorenz-attractor-source-1">1</a></sup> They come from a simplified model of heated fluid, in which one number describes circulation and two describe temperature differences. The trail plots those numbers; it does not trace a particle moving through the fluid.<sup><a id="lorenz-attractor-ref-5" href="#lorenz-attractor-source-3">3</a></sup>

Try his restart on these three equations. Both runs start with the same $y$ and $z$. Run 1 starts at $x=0.506127$, and the slider sets how far below that run 2 starts, opening on his rounding, a difference of $0.000127$. The upper chart plots $x$ over time: above the middle line the point is on one wing, below it on the other.

<figure data-lesson="lorenz-restart"></figure>

The runs stay together until time $10.79$. These are the equations' own time units, and one turn around a wing takes about $0.75$ of them.<sup><a id="lorenz-attractor-ref-6" href="#lorenz-attractor-source-4">4</a></sup>

Move the slider one notch to make the difference ten times smaller, and the runs stay together until $13.10$. One more notch gives $15.44$. Each notch buys about $2.5$ time units, averaged over many restart points.<sup><a id="lorenz-attractor-ref-7" href="#lorenz-attractor-source-4">4</a></sup>

The lower chart shows why. It plots the gap between the runs, and each line across it marks a gap a thousand times smaller than the line above. The gap climbs at a steady slope until it is as wide as the attractor, doubling on average with every turn around a wing.<sup><a id="lorenz-attractor-ref-8" href="#lorenz-attractor-source-4">4</a></sup> Lorenz saw the same thing in his weather model: the differences "more or less steadily doubled in size every four days or so".<sup><a id="lorenz-attractor-ref-9" href="#lorenz-attractor-source-1">1</a></sup>

A smaller difference starts lower on the chart and climbs at the same slope. A tenfold smaller gap needs only a bit over three more doublings, so it lasts only about three more turns. The dots on the dashed line show every notch. They are fairly evenly spaced because this restart point was picked for that. The climb comes in bursts, so at other points a single notch can add much more or much less.

So measuring better buys little. A difference a million times smaller than his rounding lasts until $25.29$, only about $15$ time units longer. Lorenz drew the same conclusion about weather: if the atmosphere behaves like his model, forecasting far ahead is impossible.<sup><a id="lorenz-attractor-ref-10" href="#lorenz-attractor-source-1">1</a></sup>

## Further exploring

### Videos

- [Chaos: The Science of the Butterfly Effect — Veritasium](https://www.youtube.com/watch?v=fDek6cYijxI)
- [Lorenz Attractor — The Coding Train](https://www.youtube.com/watch?v=f0lkz2gSsIk)

### Reading

- [Lorenz system — Wikipedia](https://en.wikipedia.org/wiki/Lorenz_system)
- [Lorenz attractor — MathWorld](https://mathworld.wolfram.com/LorenzAttractor.html)
- [When the Butterfly Effect Took Flight — MIT Technology Review](https://www.technologyreview.com/2011/02/22/196987/when-the-butterfly-effect-took-flight/)
- [Strange Attractors — Chaos: A Mathematical Adventure](https://www.chaos-math.org/en/chaos-vii-strange-attractors.html)

## Sources and notes

1. <span id="lorenz-attractor-source-1"></span> [Chaos at Fifty](https://arxiv.org/abs/1306.5777). It quotes Lorenz's own account from *The Essence of Chaos*, which gives no example digits. [Back](#lorenz-attractor-ref-1) [Back](#lorenz-attractor-ref-2) [Back](#lorenz-attractor-ref-4) [Back](#lorenz-attractor-ref-9) [Back](#lorenz-attractor-ref-10)
2. <span id="lorenz-attractor-source-2"></span> [Circa January 1961: Lorenz and the Butterfly Effect](https://www.aps.org/apsnews/2003/01/lorenz-butterfly-effect-1961). [Back](#lorenz-attractor-ref-3)
3. <span id="lorenz-attractor-source-3"></span> [Deterministic Nonperiodic Flow (archived copy)](https://web.archive.org/web/20261009044744/https://www.lmd.polytechnique.fr/~dubos/Cours/PRL/Lorenz63.pdf). [Back](#lorenz-attractor-ref-5)
4. <span id="lorenz-attractor-source-4"></span> Calculation: $dx/dt=10(y-x)$, $dy/dt=x(28-z)-y$, $dz/dt=xy-\tfrac83z$, by fourth-order Runge–Kutta with time step $0.005$. Both runs restart from $y=4.411434$, $z=25.859555$. Among $1{,}000$ points on a settled run where $x=0.506127$, this one has fairly even notches; across them a single notch adds from $0.20$ to $12.52$. "Visibly apart" means the two points are more than $5$ apart in space. Over $400$ restart points on a settled run, the average time grows by $2.54$ for each tenfold, and by $2.53$ to $2.54$ with a limit of $1$, $2$ or $10$ instead of $5$. A long run gives a growth rate of $0.906$ per time unit, which doubles the gap every $0.76$. Peaks of $z$ come every $0.75$ on average. [Back](#lorenz-attractor-ref-6) [Back](#lorenz-attractor-ref-7) [Back](#lorenz-attractor-ref-8)
