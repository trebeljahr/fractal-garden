# L-System Explorer

An L-system produces a picture by replacing letters in a string, then reading the result as drawing instructions. Aristid Lindenmayer introduced these systems in 1968 to describe plant development.<sup><a id="l-system-explorer-ref-1" href="#l-system-explorer-source-1">1</a></sup>

F usually means draw forward. Plus and minus mean turn. For example, replacing F with `F+F` gives two lines with a turn between them. Replacing both new F letters again gives `F+F+F+F`.

Every replacement uses the old string. A letter added during this round waits until the next round before being replaced itself.

<figure data-construction-player="l-system-explorer"></figure>

Brackets let the route branch. In `F[+F]F`, the first F draws a stem. The opening bracket saves its endpoint and direction. Plus turns and the next F draws a side branch. The closing bracket returns to the saved position without drawing. The final F continues the stem.

A letter can also have a replacement without drawing anything. X is often used this way to mark where more instructions will appear. The F lines stay in the string while X gets replaced again.

Try changing the angle to spread the branches apart. Then move a bracket to change where a branch starts.

## Further reading

- [L-system — Wikipedia](https://en.wikipedia.org/wiki/L-system)
- [Lindenmayer system — MathWorld](https://mathworld.wolfram.com/LindenmayerSystem.html)
- [Drawing L-systems — The Nature of Code](https://natureofcode.com/fractals/#l-systems)

## Sources and notes

1. <span id="l-system-explorer-source-1"></span> Przemysław Prusinkiewicz and Aristid Lindenmayer, [The Algorithmic Beauty of Plants, chapter 1](https://algorithmicbotany.org/papers/abop/abop-ch1.lowquality.pdf), Springer-Verlag, 1990. Sections 1.1–1.3 explain parallel rewriting and turtle interpretation; sections 1.5–1.6 extend them to spatial and branching structures. [Back](#l-system-explorer-ref-1)
