# L-System Explorer

Give a pen a few instructions. F means draw forward. Plus means turn one way. Minus means turn the other.

Now give it a rule for changing those instructions. Replace every F with a longer string. Repeat, and a short recipe can draw a whole tree or snowflake.

Aristid Lindenmayer introduced this kind of system in 1968 to describe growing plants.<sup><a id="l-system-explorer-ref-1" href="#l-system-explorer-source-1">1</a></sup>

<figure data-construction-player="l-system-explorer"></figure>

## How a branch remembers its fork

An opening bracket means “remember this position and direction.” A closing bracket means “go back there without drawing.” The next line can then grow from the same fork.

Try this plant, starting with X:

```text
X → F[+X]F[-X]+X
F → FF
```

X marks a growing tip. It does not draw a line itself. Each round turns one X into three new tips and two drawing steps. Old F steps double.

All letters change at once. Letters created in this round wait until the next round to grow.

Change the angle to spread or narrow the plant. Move a bracket to change where a branch begins. The same letters can make very different pictures.

The [Koch snowflake](/l-system/koch-snowflake) grows bumps along an edge. [Fern 1](/l-system/fern-1) uses branches inside branches. Both use this same replace-and-draw idea.

## Sources and notes

1. <span id="l-system-explorer-source-1"></span> Przemysław Prusinkiewicz and Aristid Lindenmayer, [The Algorithmic Beauty of Plants, chapter 1](https://algorithmicbotany.org/papers/abop/abop-ch1.lowquality.pdf), Springer-Verlag, 1990. Sections 1.1–1.3 explain parallel rewriting and turtle interpretation; sections 1.5–1.6 extend them to spatial and branching structures. Example counts are calculated from the stated productions. [Back](#l-system-explorer-ref-1)
