# Fern 3

Start with one line and replace every line with this, each round:

```text
F → F[+FF][-FF]F[-F][+F]F
```

Each new F is one third as long as the line it replaces, and the turns are 22.5 degrees. The [L-system explorer](/l-system/explorer) explains the turns and brackets.

Every level adds lines, but this fern never gets taller: its height stays exactly the length of the first line. From level 5 on, the width stops changing too.

<figure data-construction-player="fern-3"></figure>

Level 2 shows why. The three F's outside the brackets make a stem of three steps, which ends exactly where the old line ended, so every old line stays where it was, now in three steps. The figure tints those lines gold, and everything else is a new side branch.

Any walk from the foot of level 2 to a tip is also three steps, the length of the old line. To reach the first pair of branches, you take one stem step, then two branch steps. To reach the second pair, you take two stem steps, then one branch step. Up the main stem, you take three.

A walk that bends can't climb as high as a straight walk of the same length, and only the main stem is straight, so only its top reaches full height. Replacing a line doesn't make any walk along it longer, so this holds at every level.

The same is true of any line, whichever way it points: its replacement never reaches farther that way than the line's end. Level 2 has lines turned once, level 3 has lines turned twice, and so on, and four turns of 22.5 degrees make 90, so level 5 is the first with lines pointing straight sideways. The widest point of the fern is the end of one of those lines. Nothing can reach past it, so the width stays at 0.690 of the height.

## Further exploring

### Videos

- [L Systems: Creating Plants from Simple Rules — Computerphile](https://www.youtube.com/watch?v=puwhf-404Xc)
- [L-System Fractal Trees — The Coding Train](https://www.youtube.com/watch?v=E1B4UoSQMFw)

### Reading

- [L-System User Notes — Paul Bourke](https://paulbourke.net/fractals/lsys/)
- [The Algorithmic Beauty of Plants, chapter 1](https://algorithmicbotany.org/papers/abop/abop-ch1.lowquality.pdf)
