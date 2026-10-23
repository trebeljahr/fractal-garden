# Cesàro Fractal

Take a square and push a pointed notch into each side. Add smaller notches to every new edge. The square starts to look torn.

Each old line becomes four equal lines. The first and last go straight ahead. The middle two bend inward and back out.<sup><a id="cesaro-fractal-ref-1" href="#cesaro-fractal-source-1">1</a></sup>

<figure data-construction-player="cesaro-fractal"></figure>

Change the angle and watch the notches sharpen. The ends of each old line stay in place. A sharper notch needs a longer detour between those ends, so nearby spikes crowd together.

At 60 degrees, each new line is one third as long as the old one. That is the same size used by the [Koch snowflake](/l-system/koch-snowflake). At 85 degrees, each line is nearly half as long.

The drawing rule is `F → F+F--F+F`. F draws a line. Plus and minus turn in opposite directions. The double minus turns twice.

The square's four original corners stay at right angles. The angle control changes the little notches. For a triangular shape with inward notches, try the [Koch anti-snowflake](/l-system/koch-anti-snowflake).

## Sources and notes

1. <span id="cesaro-fractal-source-1"></span> Mark McCartney, [Four variations on a fractal theme](https://pure.ulster.ac.uk/ws/portalfiles/portal/108739143/Four_variations_on_a_fractal_theme.pdf), International Journal of Mathematical Education in Science and Technology, published online 2022, section 2, equations (1), (3) and (8). Supports the torn square construction, child scale, similarity dimension and bounded area. [Back](#cesaro-fractal-ref-1)
