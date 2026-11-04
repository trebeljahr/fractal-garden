# Crystal

Crystal replaces each side of a square with a short path containing an out-and-back line. The same replacement is then applied to every line in that path.

The pen goes around the square clockwise. For one replacement, draw forward twice. Turn right and draw one step. Turn around and draw back along that step. Turn right again and draw forward once. Each new step is one third of the old line, so the path ends where the old line ended. In the figure's rule, `F → FF+F++F+F`, F draws a step and each plus turns 90 degrees to the right.<sup><a id="crystal-ref-1" href="#crystal-source-1">1</a></sup>

<figure data-construction-player="crystal"></figure>

Go to level 4. Branches hang in from the sides of the square, and no branch touches another. Each level adds only the short side lines from the replacement, and each one ends at a new point that touches nothing. A line with a free end can't close a loop. So at every level the square holds a single gap, and **Gaps inside** stays at 1. You can get from any spot in the square to any other without crossing a line.<sup><a id="crystal-ref-2" href="#crystal-source-2">2</a></sup>

The pen's route runs along the edge of that one gap, with the gap always on its right. It is the route you would take through a maze by keeping your left hand on the wall.

The gap lies only on the inner side of the square's outline, so the pen draws the outline once. A branch has the gap on both sides, so the pen draws it twice: along one side to the tip, then back along the other. The tint shows this. At level 3, drag **Draw** slowly. Each branch changes color when the pen comes back along it.

No line is ever drawn a third time. The next level replaces a branch line once going out and once coming back. Going out, the new side line lands on one side of the line. Coming back, it lands on the other side, at a different place. Both are new lines, and the pen draws each one out and back. In [Board](/l-system/board), the repeated line runs twice in the same direction, and its count doubles at every level.

## Further exploring

- [L-system explorer](/l-system/explorer), for trying other replacement rules

### Videos

- [L-System Fractal Trees — The Coding Train](https://www.youtube.com/watch?v=E1B4UoSQMFw)

### Reading

- [L-System User Notes — Paul Bourke](https://paulbourke.net/fractals/lsys/)

## Sources and notes

1. <span id="crystal-source-1"></span> Przemysław Prusinkiewicz and Aristid Lindenmayer, [The Algorithmic Beauty of Plants, chapter 1](https://algorithmicbotany.org/papers/abop/abop-ch1.lowquality.pdf), Springer-Verlag, 1990. Background on replacing letters and reading them as drawing instructions, sections 1.2–1.3. [Back](#crystal-ref-1)
2. <span id="crystal-source-2"></span> Calculation. Measured in new steps, an old line is three steps long, and the cells of the old grid are three steps wide. No line is drawn twice in the same direction. So each stroke adds one side line into the cell on the pen's right, ending at one of that cell's four inner grid points, and each side of the cell uses a different point. Each side line adds one line and one new point, so the number of closed loops stays at 1. Checked on an exact grid for levels 1 to 7: a flood fill finds one gap, and at every point the pen takes the first line to its right. [Back](#crystal-ref-2)
