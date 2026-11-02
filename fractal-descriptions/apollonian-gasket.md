# Apollonian Gasket

Three touching circles leave a curved triangular gap. Put the largest circle that fits into that gap. It touches all three circles and leaves three smaller gaps.

Repeat in those gaps. The explorer starts with three equal circles inside a larger circle, so there are also three gaps around the outside to fill.

<figure data-construction-player="apollonian"></figure>

The circle sizes are determined by their neighbors. For any three touching circles, the next circle must touch all three without overlapping their interiors.<sup><a id="apollonian-gasket-ref-1" href="#apollonian-gasket-source-1">1</a></sup>

<figure data-article-images="apollonian"></figure>

The calculation uses **curvature**, which is one divided by a circle's radius. A smaller circle has a larger curvature. The enclosing circle gets a negative sign because it surrounds the others.

Two different circles can touch the same three circles. If you know one, you can calculate the other. Add the three fixed circles' curvatures, double the result, then subtract the known circle's curvature.

This also explains a number pattern. Start with curvatures $-1,2,2,3$, and the rule always produces whole numbers: doubling, adding and subtracting whole numbers can't create a fraction.<sup><a id="apollonian-gasket-ref-2" href="#apollonian-gasket-source-2">2</a></sup> The equal-circle start shown here uses different curvatures.

## Further exploring

### Videos

- [Apollonian Gasket Fractal — The Coding Train](https://www.youtube.com/watch?v=6UlGLB_jiCs)

### Reading

- [Apollonian gasket — Wikipedia](https://en.wikipedia.org/wiki/Apollonian_gasket)
- [Apollonian gasket — MathWorld](https://mathworld.wolfram.com/ApollonianGasket.html)
- [A Tisket, a Tasket, an Apollonian Gasket — American Scientist](https://www.americanscientist.org/article/a-tisket-a-tasket-an-apollonian-gasket)
- [Apollony Fractal — Paul Bourke](https://paulbourke.net/fractals/apollony/)

## Sources and notes

1. <span id="apollonian-gasket-source-1"></span> Ronald L. Graham, Jeffrey C. Lagarias, Colin L. Mallows, Allan R. Wilks and Catherine H. Yan, [Apollonian Circle Packings: Geometry and Group Theory I](https://arxiv.org/pdf/math/0010298), 2005 version, §2. Descartes configurations and linear replacements. [Back](#apollonian-gasket-ref-1)
2. <span id="apollonian-gasket-source-2"></span> Graham, Lagarias, Mallows, Wilks and Yan, [Apollonian Circle Packings: Number Theory](https://arxiv.org/abs/math/0009113), Journal of Number Theory 100 (2003), 1–45. Integer-curvature packings. [Back](#apollonian-gasket-ref-2)
