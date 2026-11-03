# Cesàro Fractal

This construction puts an inward triangular notch into each side of a square. Every line is replaced by four equal lines: the first and last continue along the old direction, and the middle two form the notch.<sup><a id="cesaro-fractal-ref-1" href="#cesaro-fractal-source-1">1</a></sup>

<figure data-construction-player="cesaro-fractal"></figure>

**Angle** changes the notch. The ends of the old line stay fixed, so a sharper notch needs longer lines to connect them. At 60°, each new line is one third of the old length. The [Koch anti-snowflake](/l-system/koch-anti-snowflake) uses that same notch around a triangle. At 85°, each new line is about 46% of the old length, and neighboring notches come close together.

Now drag **Angle** to 90°. The notch closes: its two sides lie on top of each other, and each new line is exactly half the old one. Level 1 becomes a 2 by 2 grid. Level 2 is 4 by 4, and level 3 is 8 by 8. One line draws all of it without lifting.<sup><a id="cesaro-fractal-ref-2" href="#cesaro-fractal-source-2">2</a></sup>

That line walks each inner grid line twice, once in each direction. The notch always goes to the same side of the direction of travel, so the two walks put their notches on opposite sides. Together those two notches make a new line across the middle of the old one. So every small square is cut into four, and the next level's grid is twice as fine.

At level 7 the grid is 128 by 128, and the picture is a solid square. Repeat forever and the line comes as close as you like to every point in the square.

## Further exploring

- [Koch curve variants — Wikipedia](https://en.wikipedia.org/wiki/Koch_snowflake#Variants_of_the_Koch_curve)
- [Cesàro fractal — MathWorld](https://mathworld.wolfram.com/CesaroFractal.html)

## Sources and notes

1. <span id="cesaro-fractal-source-1"></span> Mark McCartney, [Four variations on a fractal theme](https://pure.ulster.ac.uk/ws/portalfiles/portal/108739143/Four_variations_on_a_fractal_theme.pdf), International Journal of Mathematical Education in Science and Technology, published online 2022, section 2, equation (1). Supports the torn square construction and the length of each new line. [Back](#cesaro-fractal-ref-1)
2. <span id="cesaro-fractal-source-2"></span> Calculation. At 90°, level $n$ has $4\cdot4^n$ lines, each $2^{-n}$ of a side. In exact grid coordinates for levels 1 to 7, the walk covers all $2N(N+1)$ lines of an $N$ by $N$ grid with $N=2^n$: each inner line twice, in opposite directions, and each outer line once. [Back](#cesaro-fractal-ref-2)
