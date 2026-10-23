# Board

A line can travel around a small square and still finish three steps from where it began. The Board repeats that detour on every edge of a larger square.

## A path that spends length without gaining distance

Its replacement is `F → FF+F+F+F+FF`, with right-angle turns. Seven forward strokes span the distance of three straight strokes. Four turns restore the original heading.

<figure data-investigation="board"></figure>

At a fixed outer scale, the instruction count grows by seven and each segment shrinks by three. The drawn length multiplies by $7/3$.

The extra length folds into smaller square motifs. This makes the Board a useful comparison with the [Crystal](/l-system/crystal), where the replacement includes a half-turn and retraces part of its path.
