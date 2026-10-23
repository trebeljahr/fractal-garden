# Quadratic Koch Island

A long square-grid detour replaces every side of a square. Smaller copies of that same detour make an increasingly intricate island boundary.

## Three times the boundary length at each step

The generator contains eighteen forward strokes. Its endpoint lies six unit steps along the old edge.

<figure data-investigation="quadratic-koch-island"></figure>

At a fixed outer scale, each new stroke is one sixth of the old length. The boundary length therefore multiplies by $18/6=3$.

Its similarity dimension is $\log18/\log6$, about 1.613. The [Minkowski sausage](/l-system/minkowski-sausage) uses a shorter eight-stroke replacement on the same right-angle grid.
