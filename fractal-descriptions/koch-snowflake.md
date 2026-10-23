# Koch Snowflake

Start with a triangle. On each side, replace the middle third with a little triangular bump. Each old line is now four shorter lines.

Do the same to every new line. Smaller bumps grow on the sides of bigger bumps.

<figure data-construction-player="koch"></figure>

## An endless edge in a small space

Each round makes four times as many lines, each one third as long. So the edge gets $4/3$ times longer: first 3 sides, then the length of 4, then $16/3$.

Keep going forever and the edge has infinite length. Yet the added triangles get small fast enough that the enclosed area stays finite.<sup><a id="koch-snowflake-ref-1" href="#koch-snowflake-source-1">1</a></sup>

The final area is exactly $8/5$ of the starting triangle's area. That is 60% more room inside, with an edge that never stops getting longer.

Every stage on screen still has a finite edge. Infinity describes what happens if you never stop adding bumps.

## The drawing rule

F means draw forward. Plus and minus turn by 60 degrees. Replace every F with:

```text
F → F-F++F-F
```

Try it in the [L-system explorer](/l-system/explorer). Reverse the bumps to make the [anti-snowflake](/l-system/koch-anti-snowflake).

A cube can cast this snowflake's shadow too. Remove its corners again and again, then look straight along a diagonal. The heavier [Mosely snowflake](/mosely-snowflake) has a Koch outline from that direction.<sup><a id="koch-snowflake-ref-2" href="#koch-snowflake-source-2">2</a></sup>

## Sources and notes

1. <span id="koch-snowflake-source-1"></span> Francis Su and collaborators, [Koch Snowflake](https://math.hmc.edu/funfacts/koch-snowflake/), Harvey Mudd College, Math Fun Facts. Perimeter and geometric-series area argument; the length and area values here follow that calculation. [Back](#koch-snowflake-ref-1)
2. <span id="koch-snowflake-source-2"></span> Eric Baird, [The Impossible Snowflake](https://alt-fractals.blogspot.com/2011/04/impossible-snowflake.html), 30 April 2011. Corner-removal cube construction and Koch silhouette. [Back](#koch-snowflake-ref-2)
