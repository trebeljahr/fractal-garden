# Fern 2

Start with Y and replace the letters each round, with turns of 25.7 degrees:

```text
Y → YFX[+Y][-Y]
X → X[-FFF][+FFF]FX
```

F draws a line, while X and Y draw nothing because the next round replaces them. The [L-system explorer](/l-system/explorer) explains the turns and brackets.

Since the Y rule starts with Y, each level of this fern starts with the whole level before it, line for line. Level 2's string is `YFX[+Y][-Y]`. To make level 3 you replace every letter, so the first Y becomes `YFX[+Y][-Y]` again and everything else lands after it. The same thing happens at every level, and you can compare the two strings above the picture.

<figure data-construction-player="fern-2"></figure>

The pen reads from the left, so it draws the old plant first, in gold. F has no rule, so those lines keep their length and never change at any later level. In [Fern 1](/l-system/fern-1), each old line doubles. In [Fern 3](/l-system/fern-3), each old line is replaced.

The rest of the Y rule says what comes next. `FX` is more stem, with pairs of short side branches, and `[+Y]` and `[-Y]` are two more copies of the old plant, turned 25.7 degrees left and right. All of this starts at the top of the old main stem, so no branch on the old plant ever gets longer.

The figure zooms out at each level to fit the new lines, which is why the same gold plant looks smaller each time.

## Further exploring

### Videos

- [L Systems: Creating Plants from Simple Rules — Computerphile](https://www.youtube.com/watch?v=puwhf-404Xc)
- [L-System Fractal Trees — The Coding Train](https://www.youtube.com/watch?v=E1B4UoSQMFw)

### Reading

- [L-System User Notes — Paul Bourke](https://paulbourke.net/fractals/lsys/)
- [The Algorithmic Beauty of Plants, chapter 1](https://algorithmicbotany.org/papers/abop/abop-ch1.lowquality.pdf)
