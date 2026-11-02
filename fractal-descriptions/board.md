# Board

The Board pattern starts with a square. Each side is replaced by a seven-line path that includes a small square loop.

To draw one replacement, go forward two steps. Make three right-angle turns with one forward step after each turn. Turn once more and go forward two steps. The route finishes three step lengths ahead of its starting point.

<figure data-construction-player="board"></figure>

Making each new step one third as long keeps the ends of the old side in place. Seven one-third-length lines replace one line, so the distance drawn increases by $7/3$ each round.

Some lines are drawn twice. After the square loop, the next forward step goes over a line already drawn. Seven steps draw only six different small edges.

The replacement rule is `F → FF+F+F+F+FF`, where F draws forward and each plus makes a 90-degree turn.<sup><a id="board-ref-1" href="#board-source-1">1</a></sup>

## Further reading

- [L-system background — Wikipedia](https://en.wikipedia.org/wiki/L-system)
- [L-system background — MathWorld](https://mathworld.wolfram.com/LindenmayerSystem.html)
- [Drawing L-systems — The Nature of Code](https://natureofcode.com/fractals/#l-systems)
- [L-System User Notes — Paul Bourke](https://paulbourke.net/fractals/lsys/)

## Sources and notes

1. <span id="board-source-1"></span> Przemysław Prusinkiewicz and Aristid Lindenmayer, [The Algorithmic Beauty of Plants, chapter 1](https://algorithmicbotany.org/papers/abop/abop-ch1.lowquality.pdf), Springer-Verlag, 1990. Background on replacing letters and reading them as drawing instructions, sections 1.2–1.3. [Back](#board-ref-1)
