# Board

The Board pattern starts with a square. Each side is replaced by a seven-line path that includes a small square loop.

To draw one replacement, go forward two steps. Make three right-angle turns with one forward step after each turn. Turn once more and go forward two steps. The route finishes three step lengths ahead of its starting point, so each new step is one third of the old line. In the figure's rule, `F → FF+F+F+F+FF`, F draws a step and each plus makes a 90-degree turn.<sup><a id="board-ref-1" href="#board-source-1">1</a></sup>

<figure data-construction-player="board"></figure>

After the loop, the pen's next step goes over the line it drew just before the loop: the middle third of the old line. So seven strokes draw six different lines. The tint shows how many times each line has been drawn. At level 2, the middle of each side of the square is drawn twice.

Those two strokes run in the same direction, so at the next level their replacements land exactly on top of each other. Five of the six new lines are drawn twice, and the middle one is drawn four times. This happens again at every level. From level 2 to level 6, the line at the very middle of each side of the square is drawn 2, 4, 8, 16, then 32 times. At level 4, it is the yellow line.

Each level multiplies the pen strokes by seven and the different lines by only six. At level 6, the pen makes 67,228 strokes to draw 31,104 different lines. Repeat forever, and almost every stroke goes over a line already drawn.<sup><a id="board-ref-2" href="#board-source-2">2</a></sup>

[Crystal](/l-system/crystal) also draws a line twice, but out and back. Its two replacements land in different places, so no line there is ever drawn more than twice.

## Further exploring

- [L-system explorer](/l-system/explorer), for trying other replacement rules

### Videos

- [L-System Fractal Trees — The Coding Train](https://www.youtube.com/watch?v=E1B4UoSQMFw)

### Reading

- [L-System User Notes — Paul Bourke](https://paulbourke.net/fractals/lsys/)

## Sources and notes

1. <span id="board-source-1"></span> Przemysław Prusinkiewicz and Aristid Lindenmayer, [The Algorithmic Beauty of Plants, chapter 1](https://algorithmicbotany.org/papers/abop/abop-ch1.lowquality.pdf), Springer-Verlag, 1990. Background on replacing letters and reading them as drawing instructions, sections 1.2–1.3. [Back](#board-ref-1)
2. <span id="board-source-2"></span> Calculation. Strokes in the same place and direction get the same replacement, and the replacements of different lines share no lines. So every different line becomes six. Counted on an exact grid for levels 1 to 6: level $n+1$ has $4\cdot7^n$ strokes and $4\cdot6^n$ different lines, so the share of strokes that draw a new line is $(6/7)^n$. No line is drawn in both directions. [Back](#board-ref-2)
