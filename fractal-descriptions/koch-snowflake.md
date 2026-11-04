# Koch Snowflake

Draw a triangle with three equal sides, divide each side into thirds, and replace the middle third with two sides of a small triangle pointing outward. Each straight side now has a bump in it. Then do the same to every line in the new outline, including the sides of the bumps.

<figure data-construction-player="koch"></figure>

Going around a bump takes longer than going straight across, because four short lines now cover a distance that used to need three. So the outline gets a third longer every round.

To measure that, move the slider below, which straightens one edge without stretching its pieces, and then choose the next round. Underneath, you can compare that growing length with the area the new bumps add.

<figure data-lesson="koch-measurement"></figure>

The area behaves differently because the new triangles shrink faster than they multiply. After the first round, each batch has four times as many triangles, each with one ninth of the area, so a batch adds less than half as much area as the one before it. That means the outline keeps getting longer without limit, while the area inside approaches a fixed size.<sup><a id="koch-snowflake-ref-1" href="#koch-snowflake-source-1">1</a></sup>

**Bumps inward** turns this into the [anti-snowflake](/l-system/koch-anti-snowflake), where the triangles remove area while the outline still gets longer.

## Further exploring

### Videos

- [Fractals are typically not self-similar — 3Blue1Brown](https://www.youtube.com/watch?v=gB9n2gHsHN4)
- [Koch Fractal Snowflake — The Coding Train](https://www.youtube.com/watch?v=X8bXDKqMsXE)

### Reading

- [Koch snowflake — Wikipedia](https://en.wikipedia.org/wiki/Koch_snowflake)
- [Koch snowflake — MathWorld](https://mathworld.wolfram.com/KochSnowflake.html)
- [Koch Snowflake — Larry Riddle](https://larryriddle.agnesscott.org/ifs/ksnow/ksnow.htm)
- [The Koch curve — The Nature of Code](https://natureofcode.com/fractals/#the-koch-curve)
- [The Koch Snowflake — Mathigon](https://mathigon.org/course/fractals/introduction)

## Sources and notes

1. <span id="koch-snowflake-source-1"></span> [Koch Snowflake](https://math.hmc.edu/funfacts/koch-snowflake/). [Back](#koch-snowflake-ref-1)
