# Crystal

Crystal replaces each side of a square with a short path containing an out-and-back line. The same replacement is then applied to every line in that path.

For one replacement, draw forward twice. Turn 90 degrees and draw one step. Turn 180 degrees and draw back along that step. Turn 90 degrees again and draw forward once.

<figure data-construction-player="crystal"></figure>

Five drawing steps finish three step lengths ahead. Shortening each new step to one third keeps the ends of the original side fixed.

The pen travels five thirds of the old distance, but it draws only four different small edges. The sideways edge is drawn twice.

The rule is `F → FF+F++F+F`. F draws a step, each plus turns 90 degrees, and the double plus makes the reversal.<sup><a id="crystal-ref-1" href="#crystal-source-1">1</a></sup>

## Further reading

- [L-system background — Wikipedia](https://en.wikipedia.org/wiki/L-system)
- [L-system background — MathWorld](https://mathworld.wolfram.com/LindenmayerSystem.html)
- [Drawing L-systems — The Nature of Code](https://natureofcode.com/fractals/#l-systems)

## Sources and notes

1. <span id="crystal-source-1"></span> Przemysław Prusinkiewicz and Aristid Lindenmayer, [The Algorithmic Beauty of Plants, chapter 1](https://algorithmicbotany.org/papers/abop/abop-ch1.lowquality.pdf), Springer-Verlag, 1990. Background on replacing letters and reading them as drawing instructions, sections 1.2–1.3. [Back](#crystal-ref-1)
