# T-Square Fractal

Keep a square and center four smaller squares on its corners. Repeat on every new square, retaining all earlier generations. The default child-to-parent side ratio is $r=1/2$.

<figure data-construction-player="t-square-fractal"></figure>

This is an accumulating union. A child overlaps its parent, and later branches can place squares inside regions already covered. Outlines reveal square instances that a filled drawing hides.

At depth $n$, the recursion draws $4^n$ square instances of side $s_0r^n$. Including all levels through $n$, their count is

$$
1+4+\cdots+4^n=\frac{4^{n+1}-1}{3}.
$$

The word **instances** matters: coincident squares and overlaps do not create separate visible regions.

## Counted area and covered area

Adding every square's area, with overlaps counted repeatedly, gives

$$
s_0^2\sum_{j=0}^{n}(4r^2)^j.
$$

At the default ratio, each generation contributes another $s_0^2$. The sum grows without bound. Yet the entire drawing fits inside a square of side $s_0/(1-r)$, because corner offsets form a geometric series. At $r=1/2$, that bounding square has area $4s_0^2$.

The covered area is therefore finite, even as the counted area diverges. The filled limit has dimension $2$, since it includes the original filled square. Its perimeter requires counting the exposed outline rather than summing four sides per square. The first half-scale generation, for example, doubles a unit square's perimeter from $4$ to $8$.<sup><a id="t-square-fractal-ref-1" href="#t-square-fractal-source-1">1</a></sup>

The [Pythagoras tree](/pythagoras-tree) has the same area-counting trap. The [Sierpinski carpet](/sierpinski-carpet) uses deletion instead, so its remaining squares have disjoint interiors at each level.

## Sources and notes

1. <span id="t-square-fractal-source-1"></span> Kival Ngaokrajang and OEIS contributors, [A227621 — T-square perimeters](https://oeis.org/A227621), 2013 onward. Rounded perimeter sequence and explicit first-stage exposed-edge calculation. Count, area and bounding-box formulas here derive from this explorer’s accumulating rule. [Back](#t-square-fractal-ref-1)
