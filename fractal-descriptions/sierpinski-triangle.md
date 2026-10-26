# Sierpinski Triangle

Join the midpoints of a triangle's sides. This divides it into four equal triangles. Remove the inverted triangle in the center, then repeat inside the three remaining triangles.

The second round removes three smaller central triangles. The third removes nine. Each new hole is half as wide as a hole from the previous round.

<figure data-construction-player="sierpinski-triangle"></figure>

Each step retains three quarters of the remaining area. Repeatedly multiplying by $3/4$ sends the area toward zero. The borders remain connected at their corners even though no filled patch survives in the infinite limit.

The same shape can be made without starting from a triangle. Take a square, circle or fish. Make three half-size copies and move one toward each corner of a fixed triangle. Repeat on the whole result.

<figure data-lesson="sierpinski-seeds"></figure>

The starting shape is visible in the early stages. Each replacement makes it smaller, so its effect on the overall picture decreases. These different starting shapes approach the same Sierpinski triangle.<sup><a id="sierpinski-triangle-ref-1" href="#sierpinski-triangle-source-1">1</a></sup>

## Random dots

The three corner moves also work on a single point. Choose a corner at random. Move halfway toward it and mark the new position. Repeat from there.

<figure data-lesson="sierpinski-chaos"></figure>

Each move shrinks the distance to the chosen corner by half. The same three moves made the smaller copies above. With enough random moves, the dots trace the triangle. A few early dots may fall in its holes or outside it.<sup><a id="sierpinski-triangle-ref-2" href="#sierpinski-triangle-source-2">2</a></sup>

This is called the **chaos game**. The [Barnsley fern](/barnsley-fern) uses it too, with four rules that shrink, turn and move the point into different parts of a fern.

## A triangle made of numbers

Start with a 1. Put a 1 at each edge of the next row. Between them, add the two numbers just above. These rows form **Pascal's triangle**.

Color the odd numbers, then show more rows. The empty spaces form the same triangular holes.<sup><a id="sierpinski-triangle-ref-3" href="#sierpinski-triangle-source-3">3</a></sup>

<figure data-lesson="sierpinski-pascal"></figure>

Two odd numbers add to an even number. Two even numbers do too. The result is odd only when one number is odd and the other is even.

## A rule for each row

We can use that addition rule without writing any numbers. Start with one filled cell in a blank row. Below it, fill a cell when its two diagonal neighbors above differ. Leave it blank when they match.

This is called **Rule 90**. Its filled cells make the same pattern as the odd numbers in Pascal's triangle, with empty cells between neighboring entries.<sup><a id="sierpinski-triangle-ref-4" href="#sierpinski-triangle-source-4">4</a></sup> Change one result below and see what happens to the next rows.

<figure data-lesson="sierpinski-cells"></figure>

The [Sierpinski arrowhead](/l-system/sierpinski-arrowhead) approaches this triangle by replacing pieces of one connected line. To try the corner-copy construction in three dimensions, open the [Sierpinski tetrahedron](/sierpinski-tetrahedron): four half-size pyramids, one at each corner.

## Further reading

- [Sierpiński triangle — Wikipedia](https://en.wikipedia.org/wiki/Sierpi%C5%84ski_triangle)
- [The Sierpinski Triangle — Mathigon](https://mathigon.org/course/fractals/sierpinski)

## Sources and notes

1. <span id="sierpinski-triangle-source-1"></span> [V-variable fractals and superfractals](https://arxiv.org/pdf/math/0312314). [Back](#sierpinski-triangle-ref-1)
2. <span id="sierpinski-triangle-source-2"></span> [V-variable fractals and superfractals](https://arxiv.org/pdf/math/0312314). [Back](#sierpinski-triangle-ref-2)
3. <span id="sierpinski-triangle-source-3"></span> [Pascal’s triangle and rule 90](https://www.wolframscience.com/nks/notes-2-1--pascals-triangle-and-rule-90/). [Back](#sierpinski-triangle-ref-3)
4. <span id="sierpinski-triangle-source-4"></span> [Pascal’s triangle and rule 90](https://www.wolframscience.com/nks/notes-2-1--pascals-triangle-and-rule-90/). [Back](#sierpinski-triangle-ref-4)
