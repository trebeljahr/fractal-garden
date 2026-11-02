# Fern 2

Two letters control different parts of this fern. Y adds the main forks. X adds short side branches along the stems. Neither letter draws a line directly; both add F instructions that do the drawing.

Start with Y and use:

```text
Y → YFX[+Y][-Y]
X → X[-FFF][+FFF]FX
```

The turn angle is 25.7 degrees.

<figure data-construction-player="fern-2"></figure>

Each pair of brackets defines a side branch. The opening bracket saves the position and direction, and the closing bracket restores them without drawing back along the branch.<sup><a id="fern-2-ref-1" href="#fern-2-source-1">1</a></sup>

A Y replacement leaves three Y positions: one on the continuing stem and two on side branches. An X replacement puts three F steps on each of two side branches. It also continues with an F step and two X positions.

Old F instructions stay unchanged. New length is added through the X and Y replacements. In [Fern 1](/l-system/fern-1), by comparison, each old F becomes two F steps as well.

The first replacement draws one forward step. The second draws eleven because every X and Y in the old string gets replaced at once.

## Further reading
- [L-system explorer](/l-system/explorer), for trying other replacement rules

## Sources and notes

1. <span id="fern-2-source-1"></span> Przemysław Prusinkiewicz and Aristid Lindenmayer, [The Algorithmic Beauty of Plants, chapter 1](https://algorithmicbotany.org/papers/abop/abop-ch1.lowquality.pdf), Springer-Verlag, 1990. Section 1.6 explains the bracketed turtle method. [Back](#fern-2-ref-1)
