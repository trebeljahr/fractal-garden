# Rössler Attractor

Watch the point spiral outward. Then it rises, folds back and starts another spiral.

From above, the trail looks mostly flat. Turn to the side view and the rises become easier to see. Both views show the same moving point.

<figure data-lesson="rossler"></figure>

Otto Rössler introduced these rules in 1976. He wanted a simpler relative of the [Lorenz system](/lorenz-attractor). This one makes a spiral with only one term that multiplies two changing coordinates.<sup><a id="rossler-attractor-ref-1" href="#rossler-attractor-source-1">1</a></sup>

## What makes it fold back?

These equations give the point's speed in each direction:

$$
\frac{dx}{dt}=-y-z,\qquad
\frac{dy}{dt}=x+ay,\qquad
\frac{dz}{dt}=b+z(x-c).
$$

The defaults are $a=0.2$, $b=0.2$ and $c=5.7$.

When the point is low, the first two rules let it circle outward. As $x$ passes $c$, the last rule can make the height $z$ grow quickly. That height also changes the sideways motion, helping send the point inward again.

Start another point nearby and compare the trails. They can take different journeys even though both follow the same rules.

A crossing in one flat view does not mean the point returned to the same place. The coordinate hidden by that view can be different.

Changing **Time step** changes the size of the computer's small updates. **Steps** sets how many it takes. Halve one and double the other to compare equal durations. Different parameters can give repeating motion instead of chaos.

## Sources and notes

1. <span id="rossler-attractor-source-1"></span> Otto E. Rössler, [An Equation for Continuous Chaos](https://www.chaotic-circuits.com/wp-content/uploads/2015/01/AN-EQUATION-FOR-CONTINUOUS-CHAOS_ROSSLER.pdf), *Physics Letters A* 57(5), 12 July 1976, 397–398. Gives the default equations, one-nonlinearity motivation, and spiral/fold construction. [Back](#rossler-attractor-ref-1)
