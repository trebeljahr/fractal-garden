# Koch Anti-Snowflake

Start with an equilateral triangle. Divide each side into thirds. Replace the middle third with two sides of a smaller triangle pointing inward.

Four one-third-length lines replace each old side. Repeat on every new line. This is the inward version of the [Koch snowflake](/l-system/koch-snowflake).<sup><a id="koch-anti-snowflake-ref-1" href="#koch-anti-snowflake-source-1">1</a></sup>

<figure data-construction-player="koch-anti-snowflake"></figure>

The total edge length increases by a factor of $4/3$ each step. The area decreases because the new triangular notches remove pieces of the interior.

The first replacement removes three triangles, each with one ninth of the starting area. The next removes four times as many triangles, each with one ninth of that size. The amount removed in each round is four ninths of the previous round's amount.

Adding all these decreasing amounts gives three fifths of the original area. Two fifths remains in the infinite anti-snowflake.

The ordinary snowflake adds triangles instead and finishes with eight fifths of the starting area. The same segment sizes can therefore increase the edge length while changing the enclosed area in opposite directions.

## Sources and notes

1. <span id="koch-anti-snowflake-source-1"></span> Brian J. McCartin, [Mysteries of the Equilateral Triangle](https://www.m-hikari.com/mccartin-2.pdf), Hikari, 2010, page 58. Describes the inward anti-snowflake and its area 2/5, alongside the ordinary snowflake’s 8/5. The four-piece rule and its inward orientation match this explorer. [Back](#koch-anti-snowflake-ref-1)
