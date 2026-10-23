# Koch Anti-Snowflake

Start with an equilateral triangle and replace every edge with four shorter edges. Keep the first and last thirds. Bend the middle third into two sides of a smaller equilateral triangle, pointing inward. This reverses which side receives the bumps in the [Koch snowflake](/l-system/koch-snowflake).<sup><a id="koch-anti-snowflake-ref-1" href="#koch-anti-snowflake-source-1">1</a></sup>

The renderer uses the seed `F++F++F` and the rule `F → F+F--F+F`, with 60-degree turns. The starting triangle's orientation makes each bump point inside it.

<figure data-investigation="koch-anti-snowflake"></figure>

At stage $n$, the boundary walk has $3\cdot4^n$ strokes of length $3^{-n}$ times the original side. Its total travelled length is therefore $3(4/3)^n$ for a unit-sided starting triangle.

The area goes the other way. The first rewrite removes three small triangles, each with one ninth of the original triangle's area. Later rewrites remove four times as many triangles, each with one ninth the area of its predecessor.

If the original area is $A$, the total removed area is

$$
\frac A3\left(1+\frac49+\left(\frac49\right)^2+\cdots\right)=\frac{3A}{5}.
$$

The anti-snowflake retains $2A/5$. The ordinary snowflake instead reaches $8A/5$. The same local segment count permits opposite area changes. The [Cesàro fractal](/l-system/cesaro-fractal) makes the inward spikes sharper by changing their angle.

## Sources and notes

1. <span id="koch-anti-snowflake-source-1"></span> Brian J. McCartin, [Mysteries of the Equilateral Triangle](https://www.m-hikari.com/mccartin-2.pdf), Hikari, 2010, page 58. Describes the inward anti-snowflake and its area 2/5, alongside the ordinary snowflake’s 8/5. The series above derives the result from the renderer’s rule. [Back](#koch-anti-snowflake-ref-1)
