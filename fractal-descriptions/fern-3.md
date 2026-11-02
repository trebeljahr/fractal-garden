# Fern 3

Each line in this fern is replaced by a three-step stem with two pairs of side branches. The first pair has two steps per branch. The second pair has one step per branch.

Start with F and apply:

```text
F → F[+FF][-FF]F[-F][+F]F
```

F draws forward. Plus and minus turn by 22.5 degrees.

<figure data-construction-player="fern-3"></figure>

Brackets save a branch's starting position and direction. Closing the bracket restores them without drawing a return line, so the main stem continues from the same junction.<sup><a id="fern-3-ref-1" href="#fern-3-source-1">1</a></sup>

There are nine F steps in the replacement. On the next round, every one of those steps receives the whole replacement. A two-step side branch therefore receives two copies in succession, while a one-step branch receives one.

The segment count goes from 1 to 9 to 81. Dividing each new segment's length by three keeps the three-step main stem the same height as the line it replaces. The plant stays the same height as more branches appear.

## Further exploring

- [L-system explorer](/l-system/explorer), for trying other replacement rules

## Sources and notes

1. <span id="fern-3-source-1"></span> Przemysław Prusinkiewicz and Aristid Lindenmayer, [The Algorithmic Beauty of Plants, chapter 1](https://algorithmicbotany.org/papers/abop/abop-ch1.lowquality.pdf), Springer-Verlag, 1990. Section 1.6 supplies the branching interpretation. [Back](#fern-3-ref-1)
