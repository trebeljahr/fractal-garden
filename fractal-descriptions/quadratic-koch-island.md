# Quadratic Koch Island

Start with a square and replace each side with eighteen lines, each one sixth as long. Every turn is 90 degrees, so the smaller lines stay on a square grid, and each of those eighteen lines can then be replaced the same way.<sup><a id="quadratic-koch-island-ref-1" href="#quadratic-koch-island-source-1">1</a></sup>

<figure data-construction-player="quadratic-koch-island"></figure>

Eighteen lines at one sixth of the length come to three times the old line, so **Line length** triples at every level. **Area** stays at exactly 100% of the square, as on the [Minkowski sausage](/l-system/minkowski-sausage), because each replacement takes three small squares from the island (orange) and adds three (blue).

**With neighbors** shows where those squares go. Copies of the island fit together with no gaps and no overlaps, so what one island loses, its neighbor gains.<sup><a id="quadratic-koch-island-ref-2" href="#quadratic-koch-island-source-2">2</a></sup>

They fit because of a symmetry in the replacement. Press **Half turn** to rotate one replacement around its middle point.

<figure data-lesson="half-turn-island"></figure>

It lands exactly on itself, so the line looks the same from either end. A neighboring square draws the shared side from the other end, and it gets the same line.

Two of the eighteen steps run backward, and they bend both tinted shapes into hooks. So at level 1 a piece of each island already sits under a hook of its neighbor, and neither can slide away from the other in any direction.<sup><a id="quadratic-koch-island-ref-3" href="#quadratic-koch-island-source-3">3</a></sup>

## Further exploring

- [Koch curve variants — Wikipedia](https://en.wikipedia.org/wiki/Koch_snowflake#Variants_of_the_Koch_curve)

## Sources and notes

1. <span id="quadratic-koch-island-source-1"></span> Przemysław Prusinkiewicz and Aristid Lindenmayer, [The Algorithmic Beauty of Plants, chapter 1](https://algorithmicbotany.org/papers/abop/abop-ch1.lowquality.pdf), Springer-Verlag, 1990. Background on line replacement and drawing instructions, sections 1.1–1.3. [Back](#quadratic-koch-island-ref-1)
2. <span id="quadratic-koch-island-source-2"></span> Calculation. Level $n$ has $4\cdot18^n$ lines, each $6^{-n}$ of a side. In exact grid coordinates for levels 1 to 4, the line closes, never reaches a corner twice and encloses $36^n$ small squares, which is the starting square's area. With copies shifted by one side in each direction, levels 1 to 3 leave no small square uncovered or covered twice, and each neighbor shares exactly a quarter of the line. [Back](#quadratic-koch-island-ref-2)
3. <span id="quadratic-koch-island-source-3"></span> Calculation. Tested on two neighboring copies at level 1 in grid coordinates, for every straight direction. None leaves them apart. [Back](#quadratic-koch-island-ref-3)
