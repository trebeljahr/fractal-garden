# Koch Anti-Snowflake

Start with a triangle. Cut a little triangular notch into the middle of each side. Then cut a smaller notch into every new side.

This is the [Koch snowflake](/l-system/koch-snowflake) with its bumps pointing inward.<sup><a id="koch-anti-snowflake-ref-1" href="#koch-anti-snowflake-source-1">1</a></sup>

<figure data-construction-player="koch-anti-snowflake"></figure>

Each old line becomes four lines, each one third as long. The edge gets longer by a factor of $4/3$ each round, even though you keep removing pieces.

The first round removes three triangles. Each has one ninth of the starting triangle's area. Later rounds remove more triangles, but much smaller ones.

Add up all the cuts, including infinitely many rounds, and two fifths of the original area remains. The edge grows without end while the shape keeps a finite area.

The computer starts with `F++F++F` and uses `F → F+F--F+F`. F draws forward. Plus and minus turn by 60 degrees. The starting triangle's direction sends the notches inward.

The [Cesàro fractal](/l-system/cesaro-fractal) puts notches into a square and lets you sharpen their angle.

## Sources and notes

1. <span id="koch-anti-snowflake-source-1"></span> Brian J. McCartin, [Mysteries of the Equilateral Triangle](https://www.m-hikari.com/mccartin-2.pdf), Hikari, 2010, page 58. Describes the inward anti-snowflake and its area 2/5, alongside the ordinary snowflake’s 8/5. The four-piece rule and its inward orientation match this explorer. [Back](#koch-anti-snowflake-ref-1)
