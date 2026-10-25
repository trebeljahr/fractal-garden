# T-Square Fractal

Start with a square. Place a half-size square with its center on each corner. Keep the original square, then repeat on the four new ones.

The next step adds sixteen squares. The step after that adds sixty-four. Smaller squares extend the outline and overlap parts of earlier squares.

<figure data-construction-player="t-square-fractal"></figure>

Four half-size squares have the same combined area as their parent. Each generation therefore adds the starting square's area again, if we add the areas of the squares separately.

But some squares overlap. Adding their individual areas counts those overlaps more than once.

At the half-size setting, the entire drawing fits inside a square twice as wide as the starting square. Its covered area cannot exceed that box, however many squares are added.

An edge covered by another square is inside the shape, so it doesn't count toward the outside border. The first step doubles that border's length.<sup><a id="t-square-fractal-ref-1" href="#t-square-fractal-source-1">1</a></sup>

Use outlines to see the individual squares, including the parts hidden in a filled drawing.

## Further reading

- [T-square fractal — Wikipedia](https://en.wikipedia.org/wiki/T-square_(fractal))
- [IFS fractal gallery — Andreas Rejbrand](https://english.rejbrand.se/rejbrand/mathart_ifs.asp)

## Sources and notes

1. <span id="t-square-fractal-source-1"></span> Kival Ngaokrajang and OEIS contributors, [A227621 — T-square perimeters](https://oeis.org/A227621), 2013 onward. Rounded perimeter sequence and explicit first-stage exposed-edge calculation. [Back](#t-square-fractal-ref-1)
