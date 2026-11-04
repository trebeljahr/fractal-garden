# Mosely Snowflake

Divide a cube into 27 equal cubes, remove the eight corner cubes and the center cube, and repeat inside each of the eighteen that remain. The **Center kept** option leaves the center cube in place, so nineteen remain instead.

<figure data-construction-player="mosely-snowflake"></figure>

Removing cubes exposes new faces inside the holes. Repeat forever and the volume approaches zero, while the surface area grows without bound. This happens with either center option.<sup><a id="mosely-snowflake-ref-1" href="#mosely-snowflake-source-1">1</a></sup>

The figure opens looking toward a corner, and from there a cube has a hexagonal outline. With **Center kept**, its shadow approaches a filled [Koch snowflake](/l-system/koch-snowflake) as the construction repeats.<sup><a id="mosely-snowflake-ref-2" href="#mosely-snowflake-source-2">2</a></sup> With **Center removed**, a hole opens in the middle from level 2 on. The line of sight through the middle meets only the center cube and two corner cubes, and all three are gone after the first step, but the neighboring cubes still have corners touching that line, and their shadows close up around it. The next step removes those corners too, which opens the hole.

<figure data-article-images="mosely-koch"></figure>

You can build a model with business cards by folding six cards into a cube and tucking their flaps into neighboring cubes. The USC project called for about 49,000 cards.<sup><a id="mosely-snowflake-ref-3" href="#mosely-snowflake-source-3">3</a></sup>

## Further exploring

- [Mosely snowflake — Wikipedia](https://en.wikipedia.org/wiki/Mosely_snowflake)
- [The Mosely Snowflake Fractal — USC Libraries](https://libraries.usc.edu/about/events-and-exhibitions/exhibitions/mosely-snowflake-fractal)

## Sources and notes

1. <span id="mosely-snowflake-source-1"></span> Calculation: for a starting cube one unit wide, the exposed surface area after $n$ steps is $\frac{30\cdot18^n+48\cdot5^n}{13\cdot9^n}$ with the center removed, and $\frac{12\cdot19^n+30\cdot5^n}{7\cdot9^n}$ with it kept. These formulas count exposed faces in this construction, including cavity walls, and exclude shared faces. Step zero is the original cube. Both expressions grow without bound. [Back](#mosely-snowflake-ref-1)
2. <span id="mosely-snowflake-source-2"></span> [The Impossible Snowflake](https://alt-fractals.blogspot.com/2011/04/impossible-snowflake.html) [Back](#mosely-snowflake-ref-2)
3. <span id="mosely-snowflake-source-3"></span> [The Mosely Snowflake Sponge: Construction Guide](https://www.theiff.org/exhibits/USC%20Sponge%20Guide.pdf) [Back](#mosely-snowflake-ref-3)
