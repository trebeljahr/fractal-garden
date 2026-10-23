# T-Square Fractal

Start with a square. Place a half-size square with its center on each corner. Keep the original square, then repeat on the four new ones.

The next step adds sixteen squares. The step after that adds sixty-four. Smaller squares extend the outline and overlap parts of earlier squares.

<figure data-construction-player="t-square-fractal"></figure>

Four half-size squares have the same combined area as their parent. Each generation therefore adds the starting square's area again, if we add the areas of the squares separately.

That total counts overlaps more than once. The area covered by the drawing is smaller because a position covered by several squares still occupies only one position.

At the half-size setting, the entire drawing fits inside a square twice as wide as the starting square. Its covered area cannot exceed that box, however many squares are added.

The outline also needs a separate count. Edges covered by another square are inside the shape. They don't contribute to its perimeter. The first replacement doubles a unit square's exposed perimeter from 4 to 8.<sup><a id="t-square-fractal-ref-1" href="#t-square-fractal-source-1">1</a></sup>

Use outlines to see the individual squares, including the parts hidden in a filled drawing.

## Sources and notes

1. <span id="t-square-fractal-source-1"></span> Kival Ngaokrajang and OEIS contributors, [A227621 — T-square perimeters](https://oeis.org/A227621), 2013 onward. Rounded perimeter sequence and explicit first-stage exposed-edge calculation. [Back](#t-square-fractal-ref-1)
