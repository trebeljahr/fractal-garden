# Fern 3

One stem carries two pairs of branches. The lower pair is longer. The upper pair is shorter. Now grow that whole little plant on every line.

Start with F and use:

```text
F → F[+FF][-FF]F[-F][+F]F
```

F draws forward. Plus and minus turn by 22.5 degrees. Brackets save a fork's position and direction, then return there without drawing.<sup><a id="fern-3-ref-1" href="#fern-3-source-1">1</a></sup>

<figure data-construction-player="fern-3"></figure>

The three F steps outside brackets continue up the stem. The first pair of side branches gets two steps each. The second gets one each.

Count them: nine steps replace one. On the next round, all nine grow the same pattern. The step count goes 1, 9, 81, 729.

Shortening each new step to one third keeps the main stem's height fixed. The total distance drawn still triples each round. Some branches overlap, so that total can exceed the length of the separate lines you see.

[Fern 2](/l-system/fern-2) uses different letters for its stem and leaflets. This one gives every line the same job.

## Sources and notes

1. <span id="fern-3-source-1"></span> Przemysław Prusinkiewicz and Aristid Lindenmayer, [The Algorithmic Beauty of Plants, chapter 1](https://algorithmicbotany.org/papers/abop/abop-ch1.lowquality.pdf), Springer-Verlag, 1990. Section 1.6 supplies the branching interpretation. The nine-stroke count and three-stroke stem are direct derivations from the preset. [Back](#fern-3-ref-1)
