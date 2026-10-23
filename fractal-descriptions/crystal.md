# Crystal

Draw a square. On each side, take a small step sideways, then walk back along that same step. Repeat the pattern on every line.

Here is the rule:

```text
F → FF+F++F+F
```

F draws forward. Each plus turns 90 degrees. Two plus signs turn you around. The starting square is `F+F+F+F`.<sup><a id="crystal-ref-1" href="#crystal-source-1">1</a></sup>

<figure data-construction-player="crystal"></figure>

One replacement goes forward twice, steps sideways, comes back, then moves forward once more. Five drawing steps finish three step lengths from the start.

Make the new steps one third as long to keep the square the same size. The distance travelled grows by $5/3$ each round.

But the pen covers some lines twice. In the first replacement, five steps draw only four different edges. Counting instructions does not tell you how many separate lines you can see.

“Crystal” is this pattern's name. It does not simulate a growing mineral. The [Board](/l-system/board) takes a lap around a little square instead of going straight out and back.

## Sources and notes

1. <span id="crystal-source-1"></span> Przemysław Prusinkiewicz and Aristid Lindenmayer, [The Algorithmic Beauty of Plants, chapter 1](https://algorithmicbotany.org/papers/abop/abop-ch1.lowquality.pdf), Springer-Verlag, 1990. Sections 1.2–1.3 supply the rewriting method. The five-stroke count, three-unit span and first-stage overlap are direct calculations from the local preset. [Back](#crystal-ref-1)
