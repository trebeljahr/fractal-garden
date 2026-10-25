# Pythagoras Tree

Start with a square. Rest a right triangle on its top edge, with the triangle's longest side against the square. Build a square on each of the two free sides.

Each new square gets the same triangle and pair of squares. Repeating this makes the tree's forks.

<figure data-construction-player="pythagoras"></figure>

The right angle controls the sizes. Pythagoras' theorem says the areas of the two new squares add up to the area of their parent. When the triangle’s two shorter sides have equal length, the two new squares match. Tilt the triangle and one grows while the other shrinks.

That gives every generation the same combined area. The first square has area one, its two children together have area one, their four children together have area one, and so on.

Adding those areas gives an ever-growing sum. But the squares start to overlap. Once a new square lands on an old one, some of its area is counted again.

For the equal-branch tree, everything fits inside a rectangle six starting squares wide and four high.<sup><a id="pythagoras-tree-ref-1" href="#pythagoras-tree-source-1">1</a></sup> The covered area therefore stays finite. Toby Cathcart Burn calculated it as about 14.613 times the starting square's area, counting each covered spot once.<sup><a id="pythagoras-tree-ref-2" href="#pythagoras-tree-source-2">2</a></sup>

The [T-square fractal](/t-square-fractal) has the same overlap problem, but places four new squares at corners instead of two above a triangle.

## Further reading

- [Pythagoras tree — Wikipedia](https://en.wikipedia.org/wiki/Pythagoras_tree_(fractal))
- [Pythagoras tree — MathWorld](https://mathworld.wolfram.com/PythagorasTree.html)

## Sources and notes

1. <span id="pythagoras-tree-source-1"></span> Gerard and contributors, [What is known about the area of the symmetric Pythagorean tree?](https://mathoverflow.net/questions/129580/what-is-known-about-the-area-of-the-symmetric-pythagorean-tree), MathOverflow, 2013 onward. Bounding rectangle, overlap problem and subsequent exact calculation. [Back](#pythagoras-tree-ref-1)
2. <span id="pythagoras-tree-source-2"></span> Toby Cathcart Burn, [The Area of the Pythagoras Tree](https://penteract.github.io/pythagTree.html), 2022. Original exact calculation for the symmetric square-only tree using an automaton. Decimal value follows from his displayed fraction. [Back](#pythagoras-tree-ref-2)
