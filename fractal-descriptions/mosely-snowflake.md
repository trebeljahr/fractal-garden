# Mosely Snowflake

Divide a cube into 27 equal cubes and remove its eight corners. The **heavier** version keeps nineteen cubes. The **lighter** version also removes the center, leaving eighteen. Repeat the chosen rule inside every surviving cube.

<figure data-construction-player="mosely-snowflake"></figure>

The dimensions follow directly from these counts:

$$
D_{\rm heavy}=\frac{\log19}{\log3}\approx2.680,\qquad
D_{\rm light}=\frac{\log18}{\log3}\approx2.631.
$$

Their volume fractions after $n$ full replacements are $(19/27)^n$ and $(18/27)^n$. Both tend to zero.

## Cubes cast a Koch snowflake

<figure data-article-images="mosely-koch"></figure>

View a cube along a body diagonal with parallel rays. Its shadow is a regular hexagon. In the heavier version, recursive corner removal produces a filled [Koch snowflake](/l-system/koch-snowflake) shadow through overlapping smaller hexagons.<sup><a id="mosely-snowflake-ref-1" href="#mosely-snowflake-source-1">1</a></sup> This uses cube geometry rather than triangular bumps.

The lighter version removes each central cavity as well. Its diagonal shadow has holes: even the central viewing ray passes through removed corner cubes and the removed center. Baird’s exact filled-shadow statement concerns the heavier version. The main explorer uses perspective and a finite detail limit, so its apparent outlines vary with camera position.

The name recognizes Jeannine Mosely. Her construction guide with Margaret Wertheim documents the USC Libraries' 2011–2012 project to assemble the snowflake sponge from business cards.<sup><a id="mosely-snowflake-ref-2" href="#mosely-snowflake-source-2">2</a></sup> The guide specifies 108 X-modules and 216 Y-modules for the planned model. Its roughly 49,000 cards made the finite construction a community origami project.

Compare the [Menger sponge](/menger-sponge): it keeps the corners and removes face centers. This snowflake removes the corners and keeps face centers. Exchanging those positions changes both the passages and the diagonal silhouette.

## Sources and notes

1. <span id="mosely-snowflake-source-1"></span> Eric Baird, [The Impossible Snowflake](https://alt-fractals.blogspot.com/2011/04/impossible-snowflake.html), 30 April 2011. Nineteen-cube construction and exact diagonal Koch silhouette. [Back](#mosely-snowflake-ref-1)
2. <span id="mosely-snowflake-source-2"></span> Margaret Wertheim and Jeannine Mosely, [The Mosely Snowflake Sponge: Construction Guide](https://www.theiff.org/exhibits/USC%20Sponge%20Guide.pdf), USC Libraries Discovery Fellowship, 2011–2012. Business-card model, module counts and attribution. Volume and dimension formulas above come from this explorer’s cube counts. [Back](#mosely-snowflake-ref-2)
