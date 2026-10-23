# Fern 2

This fern has two jobs for two letters. Y grows the main forks. X adds pairs of short side branches.

Start with Y and replace the letters like this:

```text
Y → YFX[+Y][-Y]
X → X[-FFF][+FFF]FX
```

F draws forward. X and Y draw nothing until their rules add new F steps. Plus and minus turn by 25.7 degrees.

<figure data-construction-player="fern-2"></figure>

Brackets let a branch leave the stem and return to the same fork. Remember the position and direction at `[`. Restore both at `]`, without drawing a line back.<sup><a id="fern-2-ref-1" href="#fern-2-source-1">1</a></sup>

Each Y makes three Y tips: one continues, and two branch sideways. Each X makes two X tips and seven drawing steps. The `FFF` groups give its side branches three steps each.

Old F steps stay as they are. That differs from [Fern 1](/l-system/fern-1), where each old F doubles. Here, all the extra drawing instructions come from X and Y.

Starting with Y, the first three rounds draw 1, 11 and 55 steps.

## Sources and notes

1. <span id="fern-2-source-1"></span> Przemysław Prusinkiewicz and Aristid Lindenmayer, [The Algorithmic Beauty of Plants, chapter 1](https://algorithmicbotany.org/papers/abop/abop-ch1.lowquality.pdf), Springer-Verlag, 1990. Section 1.6 explains the bracketed turtle method. Symbol counts and the distinction between expanding tips and unchanged F strokes follow from the local rules. [Back](#fern-2-ref-1)
