# Sierpinski Triangle

Mark the halfway point on each side of a triangle and join the marks, which divides it into four equal triangles, then remove the upside-down one in the middle. That leaves three triangles, so remove the middle of each of those in the same way, and then the middle of every smaller triangle after that.

<figure data-construction-player="sierpinski-triangle"></figure>

Each round removes a quarter of the area that is left, so if you repeat forever no filled patch survives, although the triangle borders still meet at their corners.

## Start with a fish

Each of the three triangles left after the first round is a half-size copy of the original, moved toward one of its corners. Those moves work on any starting shape, so try them on a square, a circle or a fish: make three half-size copies, move them toward the same three corners, then repeat on the whole picture. Step all four pictures together and compare the gaps between the copies as the starting drawings get smaller.

<figure data-lesson="sierpinski-seeds"></figure>

The fish stay fish, only smaller and more numerous, and as they shrink it gets harder to make out their outline. All four arrangements approach the same Sierpinski triangle.<sup><a id="sierpinski-triangle-ref-1" href="#sierpinski-triangle-source-1">1</a></sup>

## Move one dot

You can draw the same shape with one dot instead of whole pictures. Pick a corner at random, move the dot halfway toward it and mark that position, then pick another corner and repeat from where you landed. Try a few moves one at a time and then add a thousand to see where the dots collect.

<figure data-lesson="sierpinski-chaos"></figure>

They collect in the same three half-size copies, because moving halfway to a corner is one of the same three rules that made the copies above. After many random choices the dots trace the Sierpinski triangle, apart from a few early ones that may fall in its holes or outside it.<sup><a id="sierpinski-triangle-ref-2" href="#sierpinski-triangle-source-1">1</a></sup>

This is the **chaos game**. The [Barnsley fern](/barnsley-fern) also uses random choices, but its four moves shrink, turn and place the dot in different parts of a fern.

## Add two numbers

Start a row with just a 1. Every later row has a 1 at each end, and each space between them gets the sum of the two numbers just above it. These rows form **Pascal's triangle**. Choose a number below to see its addition, then color the odd numbers and show more rows.

<figure data-lesson="sierpinski-pascal"></figure>

The even numbers leave the same triangular gaps.<sup><a id="sierpinski-triangle-ref-3" href="#sierpinski-triangle-source-2">2</a></sup> You can find those gaps without calculating the large numbers, because odd plus odd is even and even plus even is even, so a sum is odd only when one number is odd and the other is even.

## Replace the numbers with cells

Since only odd and even matter, let a filled cell stand for odd and a blank cell for even. The addition rule then becomes a drawing rule: fill the cell below when the two cells above differ, and leave it blank when they match.

In the square grid below, those two cells sit diagonally above the new one, and the cell directly above it makes no difference. This rule is called **Rule 90**.<sup><a id="sierpinski-triangle-ref-4" href="#sierpinski-triangle-source-2">2</a></sup> Each small rule below reads from top to bottom: three cells in one row decide the cell below.

<figure data-lesson="sierpinski-cells"></figure>

The filled cells make the same pattern as the odd numbers, with an empty cell between neighboring entries. You can change a bottom cell in a small rule to see how the rows change, but the small rules with two filled cells side by side never apply to Rule 90's rows, so changing just one of those does nothing.

The [Sierpinski arrowhead](/l-system/sierpinski-arrowhead) draws this triangle another way, by repeatedly bending one connected line. The [Sierpinski tetrahedron](/sierpinski-tetrahedron) extends the corner-copy rule into three dimensions, with four half-size pyramids.

## Further exploring

### Videos

- [A 1.58-Dimensional Object — Numberphile](https://www.youtube.com/watch?v=FnRhnZbDprE)
- [Fractals are typically not self-similar — 3Blue1Brown](https://www.youtube.com/watch?v=gB9n2gHsHN4)
- [Chaos Game — Numberphile](https://www.youtube.com/watch?v=kbKtFN71Lfs)
- [Chaos Game Part 1 — The Coding Train](https://www.youtube.com/watch?v=7gNzMtYo9n4)

### Reading

- [Sierpiński triangle — Wikipedia](https://en.wikipedia.org/wiki/Sierpi%C5%84ski_triangle)
- [Sierpiński sieve — MathWorld](https://mathworld.wolfram.com/SierpinskiSieve.html)
- [The Sierpinski Triangle — Mathigon](https://mathigon.org/course/fractals/sierpinski)
- [Sierpinski Gasket — Larry Riddle](https://larryriddle.agnesscott.org/ifs/siertri/siertri.htm)

## Sources and notes

1. <span id="sierpinski-triangle-source-1"></span> [V-variable fractals and superfractals](https://arxiv.org/pdf/math/0312314). [Back](#sierpinski-triangle-ref-1) [Back](#sierpinski-triangle-ref-2)
2. <span id="sierpinski-triangle-source-2"></span> [Pascal’s triangle and rule 90](https://www.wolframscience.com/nks/notes-2-1--pascals-triangle-and-rule-90/). [Back](#sierpinski-triangle-ref-3) [Back](#sierpinski-triangle-ref-4)
