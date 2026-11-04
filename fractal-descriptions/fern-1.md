# Fern 1

Start with X and replace the letters each round:

```text
X → F+[[X]-X]-F[-FX]+X
F → FF
```

F draws a line and X draws nothing, because the next round replaces it. The [L-system explorer](/l-system/explorer) explains the turns and brackets.

The X rule has three F's, which are the stems, and four X's. Each of those X's goes through the same replacements the first X did, one round behind, so the fern is four smaller copies of itself joined by three straight stems. In the figure, each copy has its own color and the stems are pale.

<figure data-construction-player="fern-1"></figure>

Level 2 draws only the three stems. Level 3 has four copies of level 2's three lines, level 4 has four copies of level 3, and so on. You can check this in the figure, where **Each copy** at one level equals **All lines** at the level before.

The plus and minus signs only turn the copies. Two turn 25 degrees left, one turns 25 degrees right and one stays upright.

Each round, a copy gets about twice as tall, and `F → FF` makes the stems twice as long to match. That's why each level looks like the one before with more detail.

Press **F stays F** to remove that rule. The four copies are still exact copies of the level before, but the stems stay one line long, so the copies start almost at the same spot and spread over each other. By level 5 the plant is wider than it is tall.

## Further exploring

### Videos

- [L Systems: Creating Plants from Simple Rules — Computerphile](https://www.youtube.com/watch?v=puwhf-404Xc)
- [L-System Fractal Trees — The Coding Train](https://www.youtube.com/watch?v=E1B4UoSQMFw)

### Reading

- [L-system plants — Wikipedia](https://en.wikipedia.org/wiki/L-system#Example_7:_fractal_plant)
- [L-System User Notes — Paul Bourke](https://paulbourke.net/fractals/lsys/)
- [The Algorithmic Beauty of Plants, chapter 1](https://algorithmicbotany.org/papers/abop/abop-ch1.lowquality.pdf)
