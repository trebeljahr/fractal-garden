# Rössler Attractor

Follow the point as it spirals outward. It stays low for several turns, then rises, turns inward and returns toward the center.<sup><a id="rossler-attractor-ref-1" href="#rossler-attractor-source-1">1</a></sup>

Choose **x–y view** to see the spiral from above. Switch to **x–z view** to see how high it goes. Both views show the same three changing coordinates.<sup><a id="rossler-attractor-ref-2" href="#rossler-attractor-source-2">2</a></sup>

<figure data-lesson="rossler"></figure>

Two lines may seem to cross from above while passing at different heights. Changing the view reveals that missing direction.

Turn on **Compare a nearby start** to follow a second point. As with the [Lorenz attractor](/lorenz-attractor), a small change at the start can eventually produce a different route.

This route never repeats, but that depends on the numbers in its equations. Above they are $a=b=0.2$ and $c=5.7$. Below, $a=b=0.1$ and you choose $c$. The route first runs until it has settled. The left picture shows it from above, with a dot on each turn where $x$ peaks. The readout compares those peaks and counts the turns before they repeat.

Press $c=4$. The route closes after one turn. With $c=6$ it needs two, one wide and one narrow. With $c=8.5$ it needs four, and with $c=8.7$ eight. With $c=9$ the readout finds no repeat.<sup><a id="rossler-attractor-ref-3" href="#rossler-attractor-source-3">3</a></sup>

<figure data-lesson="rossler-turns"></figure>

Each doubling takes a smaller change in $c$. Drag the slider and watch the count: it reaches 2 at $c=5.38$, 4 at $7.77$, 8 at $8.53$ and 16 at $8.71$. At $c=8.76$ the readout finds no repeat.<sup><a id="rossler-attractor-ref-4" href="#rossler-attractor-source-4">4</a></sup> At $c=9$ nearby starts drift apart, so the route is **chaotic**.<sup><a id="rossler-attractor-ref-5" href="#rossler-attractor-source-4">4</a></sup>

The right picture plots each peak against the next. Press $c=11$. The dots fall on one thin curve with one hump, so one peak's height nearly decides the next. Rössler described this kind of curve when he introduced these equations, and called it "cap-shaped".<sup><a id="rossler-attractor-ref-6" href="#rossler-attractor-source-1">1</a></sup> The dots of a repeat sit on a curve like this one, visited in order.

The [logistic map](/logistic-map) repeats one rule whose graph has the same one-hump shape, and it splits the same way: one number, two, four, eight, then no repeat. It also has a gap with three branches. Press $c=12$ for the same thing here: the route repeats every three turns.

The first split has the same cause as the logistic map's at $r=3$. Near the one-turn route, each turn multiplies a peak's distance from its settled height by a number. At $c=4$ that number is about $-0.59$: the next peak lands on the other side, closer. At $c=5$ it is about $-0.90$. Near $c=5.38$ it reaches $-1$, so the distance stops shrinking. Past that it grows, and the peaks alternate high and low.<sup><a id="rossler-attractor-ref-7" href="#rossler-attractor-source-4">4</a></sup>

## Further exploring

### Videos

- [Strange Attractors Explained: Stretching and Folding in Phase Space — Shane Ross](https://www.youtube.com/watch?v=Y-xqI3P-OxE)

### Reading

- [Rössler attractor — Wikipedia](https://en.wikipedia.org/wiki/R%C3%B6ssler_attractor)
- [Rössler attractor — MathWorld](https://mathworld.wolfram.com/RoesslerAttractor.html)
- [Rössler Attractor — Robert Dickau](https://www.robertdickau.com/rossler.html)
- [Rössler Attractor — Paul Bourke](https://paulbourke.net/fractals/rossler/)

## Sources and notes

1. <span id="rossler-attractor-source-1"></span> [An Equation for Continuous Chaos](https://www.chaotic-circuits.com/wp-content/uploads/2015/01/AN-EQUATION-FOR-CONTINUOUS-CHAOS_ROSSLER.pdf). [Back](#rossler-attractor-ref-1) [Back](#rossler-attractor-ref-6)
2. <span id="rossler-attractor-source-2"></span> Diagram construction. Both views plot the same numerical solution of dx/dt = −y − z, dy/dt = x + ay, dz/dt = b + z(x − c), with a = 0.2, b = 0.2 and c = 5.7. These match the equations and example parameters in Rössler’s paper. [Back](#rossler-attractor-ref-2)
3. <span id="rossler-attractor-source-3"></span> [Exploration of period-doubling cascade route to chaos with complex network based time series construction](https://arxiv.org/abs/1406.4714). Its Table V lists these values of $c$ except $4$, and also $12$ and $12.6$. [Back](#rossler-attractor-ref-3)
4. <span id="rossler-attractor-source-4"></span> Calculation: the same equations with $a=b=0.1$, by fourth-order Runge–Kutta with time step $0.02$ from $(1,1,0)$. The readout discards $20{,}000$ time units, finds the peaks of $x$ over the next $2{,}400$, and counts two peaks as the same when they differ by at most $0.001$. A long run at $c=9$ gives a gap growth rate of $0.030$ per time unit, and about $0$ at $c=4$, $6$, $8.5$ and $8.7$. The multiplier comes from how the peaks settle at each $c$; it is $-0.995$ at $c=5.35$. [Back](#rossler-attractor-ref-4) [Back](#rossler-attractor-ref-5) [Back](#rossler-attractor-ref-7)
