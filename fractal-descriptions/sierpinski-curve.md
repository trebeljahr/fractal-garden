# Sierpinski Curve

Draw a small square whose side is one step, and call that level 1. For the next level, draw a square 3 steps wide and set a copy of level 1 against the middle of each side, so each copy shares one step with the big square. Remove those shared steps, and the five squares become one closed line.

Repeat, with the whole new shape as the copy around the same 3-step square. The line stays closed and never touches itself, so every level has an inside and an outside. The levels spread over a square standing on its corner, which we'll call the diamond.

<figure data-construction-player="sierpinski-curve"></figure>

Choose **Line alone** and raise the level, and the line gets closer to every spot in the diamond. **Farthest from the line** shows how close: the worst spot is the middle of a 3-by-3 square, 1.6 steps away at every level after the first.<sup><a id="sierpinski-curve-ref-1" href="#sierpinski-curve-source-1">1</a></sup> Meanwhile **Width** more than doubles each time, so if you keep the diamond one size, each step gets about half as long and those 1.6 steps shrink too. Repeat forever and the line passes through every spot.

Choose **Inside and outside**. **Inside** starts at 100% of the diamond and falls toward exactly 50%, never below it, so the area on each side of the line heads to exactly half. That half describes the levels on the way, because the line you reach by repeating forever passes through every spot and has no inside left to measure.

The copies explain the half. Two copies with the 3-step square between them set the width, so you double it and add 3, which gives 1, 5, 13, 29, 61. Four copies and the 9 small squares in the middle set the inside, so you multiply by 4 and add 9, which gives 1, 13, 61, 253, 1021.

Add 3 to all of those. The widths become 4, 8, 16, 32, 64 and the insides become 4, 16, 64, 256, 1024, so each inside is now exactly a quarter of its width times itself: 64 × 64 = 4096, and a quarter of that is 1024. As the numbers grow, the 3s stop mattering, so the inside heads to a quarter of the box around the diamond. The diamond fills half that box, which makes a quarter of the box half the diamond.

The symbols above the drawing build this same line: F draws a step, + and - turn 90 degrees, and X draws nothing. Start from `F+XF+F+XF`, and at each level replace every X with `XF-F+F-XF+F+XF-F+F-X`.<sup><a id="sierpinski-curve-ref-2" href="#sierpinski-curve-source-2">2</a></sup>

## Further exploring

### Videos

- [Space-Filling Curves: Sierpinski Curve — Eddie Woo](https://www.youtube.com/watch?v=Ps9itT9KcdM)

### Reading

- [Sierpiński curves — Wikipedia](https://en.wikipedia.org/wiki/Sierpi%C5%84ski_curve)
- [Sierpiński curve — MathWorld](https://mathworld.wolfram.com/SierpinskiCurve.html)
- [Some combinatorial applications of spacefilling curves — John Bartholdi](https://www2.isye.gatech.edu/~jjb/research/mow/mow.html)

## Sources and notes

1. <span id="sierpinski-curve-source-1"></span> Calculation. The middle of a 3-by-3 square is half a step along and 1.5 steps across from the nearest points of the line, which is $\sqrt{2.5} \approx 1.58$ steps. Measured on this page's line at every level of the figure, no spot in the outlined diamond is farther. [Back](#sierpinski-curve-ref-1)
2. <span id="sierpinski-curve-source-2"></span> Carlos A. Grande, [Compact reactor architectures designed with fractals — supporting information (archived copy)](https://web.archive.org/web/20240710183553/https://www.rsc.org/suppdata/d1/re/d1re00107h/d1re00107h1.pdf), Reaction Chemistry & Engineering, 2021, table S1. Table S1 lists this replacement under “Square curve”, starting from `X+F+X`. [Back](#sierpinski-curve-ref-2)
