# Board

Start with a square. Replace each side with a path that takes a lap around a tiny square before continuing. Repeat that detour on every new line.

The drawing instructions are:

```text
F → FF+F+F+F+FF
```

F means draw forward. Each plus means turn 90 degrees. Start with `F+F+F+F` to make the first square.<sup><a id="board-ref-1" href="#board-source-1">1</a></sup>

<figure data-construction-player="board"></figure>

Follow one replacement. Go forward twice, walk around the small square, then carry on. Seven steps finish only three step lengths from where you began.

To keep the original corners in place, make each new step one third as long. The path gets $7/3$ times longer each round.

Part of the route goes over a line it already drew. Seven drawing steps make only six different small edges in the first replacement. That is why counting steps can give a different answer from measuring the visible lines.

[Crystal](/l-system/crystal) makes an even shorter detour: out along one line, then straight back.

## Sources and notes

1. <span id="board-source-1"></span> Przemysław Prusinkiewicz and Aristid Lindenmayer, [The Algorithmic Beauty of Plants, chapter 1](https://algorithmicbotany.org/papers/abop/abop-ch1.lowquality.pdf), Springer-Verlag, 1990. Sections 1.2–1.3 explain parallel rewriting and turtle interpretation. Step counts, finishing position and repeated edges follow directly from this explorer’s rule. [Back](#board-ref-1)
