# Quadratic Snowflake

Replace the middle third of a straight line with three sides of a small square. The first and last thirds stay straight. Five lines now connect the original endpoints.

Apply the same replacement to every new line.<sup><a id="quadratic-snowflake-ref-1" href="#quadratic-snowflake-source-1">1</a></sup>

<figure data-construction-player="quadratic-snowflake"></figure>

This page starts with a square whose sides each contain two drawing steps. The first replacement therefore puts two square-shaped notches along each side. Their orientation makes them point inward.

Every new line is one third as long as the line it replaces. Five one-third-length lines make the route $5/3$ as long. Repeating this increases the total distance drawn while the original square's corners remain fixed.

The rule is `F → F+F-F-F+F`. F draws forward and each turn is 90 degrees. The three middle F steps form the three sides of the small square.

The [quadratic Koch surface](/quadratic-koch-3d) uses a related replacement on a surface. It puts small cubes onto square faces instead of changing a flat line.

## Further reading

- [Koch curve variants — Wikipedia](https://en.wikipedia.org/wiki/Koch_snowflake#Variants_of_the_Koch_curve)
- [Koch curve background — MathWorld](https://mathworld.wolfram.com/KochCurve.html)
- [Quadratic Koch curves and surfaces — Robert Dickau](https://www.robertdickau.com/kochsurface.html)

## Sources and notes

1. <span id="quadratic-snowflake-source-1"></span> Przemysław Prusinkiewicz and Aristid Lindenmayer, [The Algorithmic Beauty of Plants, chapter 1](https://algorithmicbotany.org/papers/abop/abop-ch1.lowquality.pdf), Springer-Verlag, 1990. Background on line replacement and drawing instructions, sections 1.1–1.3. [Back](#quadratic-snowflake-ref-1)
