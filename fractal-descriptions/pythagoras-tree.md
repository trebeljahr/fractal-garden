# Pythagoras Tree

Put a right triangle on top of a square, with its longest side against the square. Build a new square on each of the triangle's other sides.

Repeat on both new squares. Two squares become four, then eight. The tree starts to curl around itself.

<figure data-construction-player="pythagoras"></figure>

## Two squares share one square's area

Pythagoras' theorem says the two small squares have the same combined area as the square beneath them.

Change the triangle's angle. One child grows while the other shrinks, but their combined area stays the same. At 45 degrees, they match. At 30 degrees, one has three times the area of the other.

## Why the areas do not add up

Every generation adds the starting square's area again. That sum grows forever. Yet the symmetric tree fits inside a rectangle only six starting squares wide and four high.<sup><a id="pythagoras-tree-ref-1" href="#pythagoras-tree-source-1">1</a></sup>

The squares must overlap. Adding their individual areas counts the same patches many times.

Toby Cathcart Burn calculated the area covered by the endless symmetric tree: about 14.613 times the starting square's area. His exact answer is a fraction with more than a hundred digits in each part.<sup><a id="pythagoras-tree-ref-2" href="#pythagoras-tree-source-2">2</a></sup>

That answer counts the squares alone. Fill the triangular gaps or change the fork angle, and you get a different area.

The [T-square fractal](/t-square-fractal) also piles up overlapping squares. The [fractal canopy](/fractal-canopy) grows lines instead.

## Sources and notes

1. <span id="pythagoras-tree-source-1"></span> Gerard and contributors, [What is known about the area of the symmetric Pythagorean tree?](https://mathoverflow.net/questions/129580/what-is-known-about-the-area-of-the-symmetric-pythagorean-tree), MathOverflow, 2013 onward. Bounding rectangle, overlap problem and subsequent exact calculation. [Back](#pythagoras-tree-ref-1)
2. <span id="pythagoras-tree-source-2"></span> Toby Cathcart Burn, [The Area of the Pythagoras Tree](https://penteract.github.io/pythagTree.html), 2022. Original exact calculation for the symmetric square-only tree using an automaton. Decimal value follows from his displayed fraction. [Back](#pythagoras-tree-ref-2)
