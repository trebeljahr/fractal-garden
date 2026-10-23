# Apollonian Gasket

Three touching circles leave a gap between them. What is the biggest circle you can fit in that gap? Draw it. Now fill the smaller gaps the same way.

This explorer starts with three equal circles inside one large circle. The first round fills four gaps: one in the middle and three around the outside.

<figure data-construction-player="apollonian"></figure>

Every filled gap creates three more. The circles get smaller, but you never run out of places to put the next one.

<figure data-article-images="apollonian"></figure>

## How do you find the next circle?

A small circle bends more sharply than a large one. Mathematicians measure that bend with **curvature**: one divided by the radius. The enclosing circle gets a negative sign because it wraps around the others.

If three circles stay fixed, there are two circles that touch all three. Once you know one, you can calculate the other. Add the three fixed curvatures, double the sum, then subtract the known fourth curvature.<sup><a id="apollonian-gasket-ref-1" href="#apollonian-gasket-source-1">1</a></sup>

$$
b_{\text{new}}=2(b_1+b_2+b_3)-b_{\text{old}}.
$$

Start with whole-number curvatures, such as $-1,2,2,3$, and every new curvature is also a whole number. The rule uses only addition and subtraction.<sup><a id="apollonian-gasket-ref-2" href="#apollonian-gasket-source-2">2</a></sup> The equal-circle start shown here uses different numbers.

The gaps left after infinitely many circles form the gasket. Unlike the [Sierpinski carpet](/sierpinski-carpet), the circles do not all shrink by the same amount.

## Sources and notes

1. <span id="apollonian-gasket-source-1"></span> Ronald L. Graham, Jeffrey C. Lagarias, Colin L. Mallows, Allan R. Wilks and Catherine H. Yan, [Apollonian Circle Packings: Geometry and Group Theory I](https://arxiv.org/pdf/math/0010298), 2005 version, §2. Descartes configurations and linear replacements. [Back](#apollonian-gasket-ref-1)
2. <span id="apollonian-gasket-source-2"></span> Graham, Lagarias, Mallows, Wilks and Yan, [Apollonian Circle Packings: Number Theory](https://arxiv.org/abs/math/0009113), Journal of Number Theory 100 (2003), 1–45. Integer-curvature packings. [Back](#apollonian-gasket-ref-2)
