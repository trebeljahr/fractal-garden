# Crystal

The Crystal grows repeated square-edged notches. Some strokes return over positions the path already visited, so its appearance hides part of its drawing history.

## Drawing twice does not make two edges

The rule `F → FF+F++F+F` has five forward strokes. The doubled turn reverses the heading halfway through the replacement.

<figure data-investigation="crystal"></figure>

Counting strokes measures the work of drawing the path. It does not count distinct edges when strokes overlap. A dimension formula based only on that count needs additional assumptions about overlap.

The [Board](/l-system/board) uses a related square-grid detour. The [Minkowski sausage](/l-system/minkowski-sausage) balances outward and inward bumps along each replaced edge.
