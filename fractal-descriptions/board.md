# Board

The Board starts with a square, `F+F+F+F`. Every F becomes `FF+F+F+F+FF`, using 90-degree turns. This preset uses parallel L-system rewriting.<sup><a id="board-ref-1" href="#board-source-1">1</a></sup>

Follow one replacement from left to right. Two strokes advance along the old edge. Three more travel around a small square. The final two continue forward. Seven strokes finish three unit lengths from the start, facing the original direction.

<figure data-investigation="board"></figure>

With the original corners fixed, each child stroke has one third of the parent's length. After $n$ rewrites, the four-sided word contains $4\cdot7^n$ forward instructions. Its total travelled length is $4(7/3)^n$ when the initial sides have unit length.

There is a catch in that count. The square detour returns to an earlier point, and the departure retraces one unit edge. One isolated first replacement therefore draws six distinct unit edges with seven strokes. The visible set and the turtle's travelled path have different length counts. [Crystal](/l-system/crystal) makes this distinction even clearer with an immediate out-and-back branch.

## Sources and notes

1. <span id="board-source-1"></span> Przemysław Prusinkiewicz and Aristid Lindenmayer, [The Algorithmic Beauty of Plants, chapter 1](https://algorithmicbotany.org/papers/abop/abop-ch1.lowquality.pdf), Springer-Verlag, 1990. Sections 1.2–1.3 explain parallel rewriting and turtle interpretation. Counts, displacement and retracing above are direct derivations from this garden’s rule. [Back](#board-ref-1)
