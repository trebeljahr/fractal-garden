# Quadratic Snowflake

Replace the middle third of a straight line with three sides of a small square. The first and last thirds stay straight. Five lines now connect the original endpoints.

Apply the same replacement to every new line.<sup><a id="quadratic-snowflake-ref-1" href="#quadratic-snowflake-source-1">1</a></sup>

This page starts with a square whose sides each contain two drawing steps. The first replacement therefore puts two square-shaped notches along each side. Every notch points inward, so it takes a small square out of the area inside the line.

<figure data-construction-player="quadratic-snowflake"></figure>

Raise the level and watch **Area left**. It falls to 77.8%, then 65.4%, then 58.6%, but it never goes below 50%. Repeat forever and exactly half the starting square stays inside the line: the dark diamond in the middle.<sup><a id="quadratic-snowflake-ref-2" href="#quadratic-snowflake-source-2">2</a></sup>

Now choose **One step per side**. The rule stays the same. Only the start changes, and **Area left** now falls toward zero.

The tinted triangles show why. Each one sits on the inner side of a line, with that line as its long side. At the next level, the notch takes a square out of the triangle. The rest of the triangle becomes five smaller triangles, one on each new line. Compare levels 1 and 2. So a notch never leaves its triangle, and the tinted area shrinks toward zero.

What stays inside the line forever is whatever was never tinted. With two steps per side, the eight triangles fill the square's four corners and leave the diamond. The diamond's corners are the middles of the square's sides, so its edges cut each quarter of the square in half. With one step per side, the four triangles fill the whole square and leave nothing.

With one step per side, the line is also the outline of the [diagonal Vicsek fractal](/vicsek-fractal-2d). The first notches remove the middle square along each side of a three-by-three grid. That leaves the center and the four corners, and all four sides of those five squares now lie on the line. So the next replacement does the same inside each of them.

## Further exploring

- [Koch curve variants — Wikipedia](https://en.wikipedia.org/wiki/Koch_snowflake#Variants_of_the_Koch_curve)
- [Quadratic Koch curves and surfaces — Robert Dickau](https://www.robertdickau.com/kochsurface.html)
- [Fun with Koch Snowflakes — Wolfram Demonstrations](https://demonstrations.wolfram.com/FunWithKochSnowflakes/)

## Sources and notes

1. <span id="quadratic-snowflake-source-1"></span> Przemysław Prusinkiewicz and Aristid Lindenmayer, [The Algorithmic Beauty of Plants, chapter 1](https://algorithmicbotany.org/papers/abop/abop-ch1.lowquality.pdf), Springer-Verlag, 1990. Background on line replacement and drawing instructions, sections 1.1–1.3. [Back](#quadratic-snowflake-ref-1)
2. <span id="quadratic-snowflake-source-2"></span> Calculation. A notch takes $4/9$ of its triangle and leaves $5/9$. After $n$ replacements the area inside the line is $\tfrac12+\tfrac12(5/9)^n$ of the square with two steps per side and $(5/9)^n$ with one. Measured on this page's walk at every level of the figure. [Back](#quadratic-snowflake-ref-2)
