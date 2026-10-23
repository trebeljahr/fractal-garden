# T-Square Fractal

Draw a square. Center a half-size square on each corner. Keep the old square and repeat on every new one.

The squares spread outward. Smaller squares fill some gaps and overlap others.

<figure data-construction-player="t-square-fractal"></figure>

Each new square makes four more. The number added goes 1, 4, 16, 64. Outlines let you see squares that a filled picture hides.

## How can the area keep growing?

Four half-size squares have the same combined area as one parent square. So every generation adds the starting square's area again, if you count every square separately.

But many squares cover the same places. Adding their areas counts those places more than once.

At the default half-size setting, the whole picture fits inside a square twice as wide as the start. Its covered area cannot grow beyond that box.

The outside edge also differs from the sum of every square's four sides. Hidden edges do not count toward the outline. The first round doubles a unit square's outside perimeter from 4 to 8.<sup><a id="t-square-fractal-ref-1" href="#t-square-fractal-source-1">1</a></sup>

Change the size ratio to change how far the branches reach and how much they overlap. The [Pythagoras tree](/pythagoras-tree) has the same area-counting puzzle, with two new squares at each fork.

## Sources and notes

1. <span id="t-square-fractal-source-1"></span> Kival Ngaokrajang and OEIS contributors, [A227621 — T-square perimeters](https://oeis.org/A227621), 2013 onward. Rounded perimeter sequence and explicit first-stage exposed-edge calculation. Square counts, area sums and the enclosing box follow directly from this explorer’s rule. [Back](#t-square-fractal-ref-1)
