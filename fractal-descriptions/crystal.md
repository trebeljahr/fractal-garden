# Crystal

Crystal starts from the square `F+F+F+F` and replaces each F with `FF+F++F+F`. All turns are 90 degrees. The double plus makes a half-turn. “Crystal” is the name of this local preset, rather than a model of crystal growth.<sup><a id="crystal-ref-1" href="#crystal-source-1">1</a></sup>

An isolated replacement advances twice, steps sideways, reverses over that sideways step, then advances once more. Five forward instructions finish three unit lengths from the start. The sideways edge is drawn twice, so only four distinct unit edges appear at this stage.

<figure data-investigation="crystal"></figure>

To preserve the original square's side length, divide each new stroke length by three. The word then contains $4\cdot5^n$ strokes after $n$ rewrites, and its travelled length multiplies by $5/3$ per rewrite.

The first sideways excursion returns along its own edge. At later stages, those two opposed edges receive their own replacements, so their descendants need separate inspection. Counting five copies cannot by itself establish the visible set's Hausdorff dimension. Compare the [Board](/l-system/board), whose small square detour also repeats part of its route, and the balanced bumps of the [Minkowski sausage](/l-system/minkowski-sausage).

## Sources and notes

1. <span id="crystal-source-1"></span> Przemysław Prusinkiewicz and Aristid Lindenmayer, [The Algorithmic Beauty of Plants, chapter 1](https://algorithmicbotany.org/papers/abop/abop-ch1.lowquality.pdf), Springer-Verlag, 1990. Sections 1.2–1.3 supply the rewriting method. The five-stroke count, three-unit span and first-stage overlap are direct calculations from the local preset. [Back](#crystal-ref-1)
