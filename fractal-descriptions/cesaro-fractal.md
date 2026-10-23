# Cesàro Fractal

Four inward-pointing curves turn a square into a torn square. Each edge receives the replacement `F → F+F--F+F`. The square's corners keep their 90-degree turns, while the plus and minus bends use the adjustable angle $\alpha$.<sup><a id="cesaro-fractal-ref-1" href="#cesaro-fractal-source-1">1</a></sup>

Two of the four child strokes follow the old direction. The other two point at angles $\alpha$ and $-\alpha$. Four unit strokes therefore span $2+2\cos\alpha$ units along the old edge, with no net sideways displacement.

<figure data-investigation="cesaro-fractal"></figure>

Keeping the old endpoints fixed gives the child scale

$$
r=\frac{1}{2(1+\cos\alpha)}.
$$

At 60 degrees, $r=1/3$, exactly the Koch scale. At 85 degrees, $r\approx0.460$. A sharper bend needs larger child segments, which explains why neighbouring spikes crowd together.

Four copies give similarity dimension $\log4/\log[2(1+\cos\alpha)]$. This tends to 2 as the bend approaches 90 degrees. It is a similarity count, rather than an automatic dimension theorem for overlapping copies.

There is also an area calculation. For an initial chord of unit length, the region between one curve and its chord has area $\sin\alpha/[4(2+\cos\alpha)]$. McCartney derives it by adding one triangle and four reduced copies of that same region. The [Koch anti-snowflake](/l-system/koch-anti-snowflake) instead places three inward curves around a triangle.

## Sources and notes

1. <span id="cesaro-fractal-source-1"></span> Mark McCartney, [Four variations on a fractal theme](https://pure.ulster.ac.uk/ws/portalfiles/portal/108739143/Four_variations_on_a_fractal_theme.pdf), International Journal of Mathematical Education in Science and Technology, published online 2022, section 2, equations (1), (3) and (8). Supports the torn square construction, child scale, similarity dimension and bounded area. [Back](#cesaro-fractal-ref-1)
