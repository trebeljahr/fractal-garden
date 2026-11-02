# Sierpinski Triangle

Mark the halfway point on each side of a triangle. Join the marks to make four equal triangles, then remove the upside-down one in the middle.

Three triangles remain. Remove the middle of each one in the same way. Then do it again inside every smaller triangle.

<figure data-construction-player="sierpinski-triangle"></figure>

Each round removes a quarter of the area that is left. Repeat forever and no filled patch survives, although the triangle borders still meet at their corners.

## Start with a fish

Look at the three triangles left after the first round. Each is a half-size copy of the original, moved toward one of its corners.

Try those same moves with a different starting shape. Make three half-size copies of a square, a circle or a fish. Move them toward the same three corners, then repeat on the whole picture.

<figure data-lesson="sierpinski-seeds"></figure>

The fish stay fish. They just get smaller and more numerous. As each copy shrinks, its original outline becomes harder to distinguish. All four arrangements approach the same Sierpinski triangle.<sup><a id="sierpinski-triangle-ref-1" href="#sierpinski-triangle-source-1">1</a></sup>

## Move one dot

Instead of copying a whole picture, start with one dot. Pick a corner at random and move the dot halfway toward it. Mark that position. Then pick another corner and repeat from the new position.

Try a few moves one at a time. Then add a thousand. Where do the dots collect?

<figure data-lesson="sierpinski-chaos"></figure>

The dots collect in the same three half-size copies we made above. Each move uses one of the same three rules. After many random choices, the dots trace the Sierpinski triangle. A few early dots may fall in its holes or outside it.<sup><a id="sierpinski-triangle-ref-2" href="#sierpinski-triangle-source-1">1</a></sup>

This is the **chaos game**. The [Barnsley fern](/barnsley-fern) also uses random choices, but its four moves shrink, turn and place the dot in different parts of a fern.

## Add two numbers

Start a row with just a 1. Put a 1 at each end of the next row. To fill each space between them, add the two numbers just above it. These rows form **Pascal's triangle**.

Choose a number below to see its addition. Then color the odd numbers and show more rows.

<figure data-lesson="sierpinski-pascal"></figure>

The even numbers leave the same triangular gaps.<sup><a id="sierpinski-triangle-ref-3" href="#sierpinski-triangle-source-2">2</a></sup> We can find those gaps without calculating the large numbers: odd plus odd is even, and even plus even is even. A sum is odd only when one number is odd and the other is even.

## Replace the numbers with cells

Let a filled cell stand for odd and a blank cell for even. The addition rule becomes a drawing rule: fill the cell below when the two cells above differ. Leave it blank when they match.

In the square grid below, those two cells sit diagonally above the new one. The cell directly above it makes no difference. This rule is called **Rule 90**.<sup><a id="sierpinski-triangle-ref-4" href="#sierpinski-triangle-source-2">2</a></sup>

<figure data-lesson="sierpinski-cells"></figure>

The filled cells make the same pattern as the odd numbers, with an empty cell between neighboring entries. Change one result in the rule to see how the rows change.

The [Sierpinski arrowhead](/l-system/sierpinski-arrowhead) draws this triangle another way, by repeatedly bending one connected line. The [Sierpinski tetrahedron](/sierpinski-tetrahedron) extends the corner-copy rule into three dimensions, with four half-size pyramids.

## Further reading

- [Sierpiński triangle — Wikipedia](https://en.wikipedia.org/wiki/Sierpi%C5%84ski_triangle)
- [Sierpiński sieve — MathWorld](https://mathworld.wolfram.com/SierpinskiSieve.html)
- [The Sierpinski Triangle — Mathigon](https://mathigon.org/course/fractals/sierpinski)

## Sources and notes

1. <span id="sierpinski-triangle-source-1"></span> [V-variable fractals and superfractals](https://arxiv.org/pdf/math/0312314). [Back](#sierpinski-triangle-ref-1) [Back](#sierpinski-triangle-ref-2)
2. <span id="sierpinski-triangle-source-2"></span> [Pascal’s triangle and rule 90](https://www.wolframscience.com/nks/notes-2-1--pascals-triangle-and-rule-90/). [Back](#sierpinski-triangle-ref-3) [Back](#sierpinski-triangle-ref-4)
