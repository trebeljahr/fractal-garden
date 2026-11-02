# Pythagoras Tree

Start with a square. Rest a right triangle on its top edge, with the triangle's longest side against the square. Build a square on each of the two free sides.

Each new square gets the same triangle and pair of squares. Repeating this makes the tree's forks.

<figure data-construction-player="pythagoras"></figure>

The right angle controls the sizes. Pythagoras' theorem says the areas of the two new squares add up to the area of their parent. When the triangle’s two shorter sides have equal length, the two new squares match. Tilt the triangle and one grows while the other shrinks.

Repeat the fork in both new squares. Their four children have the same combined area too. Every generation adds the same total area.

Adding those areas gives an ever-growing sum. But the squares start to overlap. Once a new square lands on an old one, some of its area is counted again.

Yet the equal-branch tree fits inside a fixed rectangle, however many squares you add.<sup><a id="pythagoras-tree-ref-1" href="#pythagoras-tree-source-1">1</a></sup> Its covered area stays finite. Measuring that area means counting each covered spot only once.<sup><a id="pythagoras-tree-ref-2" href="#pythagoras-tree-source-2">2</a></sup>

The [T-square fractal](/t-square-fractal) has the same overlap problem, but places four new squares at corners instead of two above a triangle.

## Further exploring

- [Pythagoras tree — Wikipedia](https://en.wikipedia.org/wiki/Pythagoras_tree_(fractal))
- [Pythagoras tree — MathWorld](https://mathworld.wolfram.com/PythagorasTree.html)
- [Pythagorean Tree — Larry Riddle](https://larryriddle.agnesscott.org/ifs/pythagorean/pythTree.htm)

## Sources and notes

1. <span id="pythagoras-tree-source-1"></span> [What is known about the area of the symmetric Pythagorean tree?](https://mathoverflow.net/questions/129580/what-is-known-about-the-area-of-the-symmetric-pythagorean-tree). [Back](#pythagoras-tree-ref-1)
2. <span id="pythagoras-tree-source-2"></span> [The Area of the Pythagoras Tree](https://penteract.github.io/pythagTree.html). [Back](#pythagoras-tree-ref-2)
