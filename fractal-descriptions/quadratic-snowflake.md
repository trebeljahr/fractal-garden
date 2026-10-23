# Quadratic Snowflake

A square bump takes the place of the triangular Koch bump. The local replacement is `F → F+F-F-F+F`, with 90-degree turns. Five strokes span three unit lengths: one forward step, three sides of a small square, then another forward step.<sup><a id="quadratic-snowflake-ref-1" href="#quadratic-snowflake-source-1">1</a></sup>

This page starts with `FF+FF+FF+FF`. Each side of the initial square contains two strokes, so the first rewrite places two bumps along each side. The turns send those bumps toward the square's interior.

<figure data-investigation="quadratic-snowflake"></figure>

Keep the starting square fixed by dividing the new stroke length by three. Stage $n$ then has $8\cdot5^n$ forward strokes. Its boundary walk's length multiplies by $5/3$ per stage. The corresponding similarity exponent is $\log5/\log3\approx1.465$.

The extra strokes come from a detour around three sides of a square. Unlike the [Minkowski sausage](/l-system/minkowski-sausage), this generator has no second bump to cancel the first bump's signed area.

The [quadratic Koch surface](/quadratic-koch-3d) moves the bump idea into three dimensions. It divides a square face into nine smaller faces and adds the exposed faces of a cube over the middle one.

## Sources and notes

1. <span id="quadratic-snowflake-source-1"></span> Przemysław Prusinkiewicz and Aristid Lindenmayer, [The Algorithmic Beauty of Plants, chapter 1](https://algorithmicbotany.org/papers/abop/abop-ch1.lowquality.pdf), Springer-Verlag, 1990. Sections 1.1–1.3 explain edge replacement and turtle interpretation. The five-piece rule, two-stroke seed sides, inward orientation, counts and similarity exponent are direct derivations from this page’s preset. The linked 3D page implements its own face-replacement construction. [Back](#quadratic-snowflake-ref-1)
