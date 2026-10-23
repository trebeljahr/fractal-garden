# Quadratic Koch Island

This version starts with a square and replaces each side with an eighteen-segment path. Every turn is 90 degrees, so the smaller lines remain on a square grid.

The same replacement is repeated on each of those eighteen segments.<sup><a id="quadratic-koch-island-ref-1" href="#quadratic-koch-island-source-1">1</a></sup>

<figure data-construction-player="quadratic-koch-island"></figure>

Eight steps point along the original side and two point backward. Four point to each side. The sideways steps cancel, and the forward steps exceed the backward ones by six.

The replacement therefore finishes six step lengths ahead. Make each new step one sixth of the original length to keep its endpoints fixed.

Eighteen segments at one-sixth length have three times the old length. Every replacement triples the distance drawn around the route.

The exact rule is:

```text
F → F+FF-FF-F-F+F+FF-F-F+F+FF+FF-F
```

F draws forward. Plus and minus turn in opposite directions. Other patterns called quadratic Koch islands use different replacements, so their counts and sizes can differ from this version.

## Sources and notes

1. <span id="quadratic-koch-island-source-1"></span> Przemysław Prusinkiewicz and Aristid Lindenmayer, [The Algorithmic Beauty of Plants, chapter 1](https://algorithmicbotany.org/papers/abop/abop-ch1.lowquality.pdf), Springer-Verlag, 1990. Sections 1.1–1.3 explain Koch-style edge replacement and turtle words. The eighteen-step rule, six-step span and signed-area balance are direct calculations from this explorer’s rule. [Back](#quadratic-koch-island-ref-1)
