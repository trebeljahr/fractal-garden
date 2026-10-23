# Apollonian Gasket

Three touching circles leave a curved triangular gap. Fit a fourth circle into it, then fill the three smaller gaps it creates. The explorer begins with three equal circles inside a unit enclosing circle. Their radius is $2\sqrt3-3$.

<figure data-construction-player="apollonian"></figure>

The first round fills four gaps: the central gap and three beside the enclosing circle. Each later gap produces three descendants. After $n$ rounds, this rule gives $2\cdot3^n+2$ circles, including the enclosing circle.

<figure data-article-images="apollonian"></figure>

## A quadratic equation becomes a linear replacement

Write a circle's signed curvature as $b=1/r$, with negative curvature for the enclosing circle. Four mutually tangent circles satisfy Descartes' theorem:<sup><a id="apollonian-gasket-ref-1" href="#apollonian-gasket-source-1">1</a></sup>

$$
(b_1+b_2+b_3+b_4)^2=2(b_1^2+b_2^2+b_3^2+b_4^2).
$$

For three fixed circles, this is a quadratic equation for the fourth curvature. Its two roots obey

$$
b_4'=2(b_1+b_2+b_3)-b_4.
$$

Knowing one tangent circle therefore gives the other without another square root. The explorer uses this replacement for both curvature and curvature-weighted center coordinates.

That formula also explains **integral Apollonian packings**. Start with integer curvatures such as $(-1,2,2,3)$, and every later curvature stays integral.<sup><a id="apollonian-gasket-ref-2" href="#apollonian-gasket-source-2">2</a></sup> This explorer's three-equal-circle seed is a different configuration.

The residual gasket consists of points inside the enclosing circle and outside the interiors of all inserted circles. Its dimension is approximately $1.306$, a numerical value rather than a simple copy-count logarithm.<sup><a id="apollonian-gasket-ref-3" href="#apollonian-gasket-source-3">3</a></sup> Unlike the [Sierpinski carpet](/sierpinski-carpet), these circles do not shrink by one fixed ratio.

## Sources and notes

1. <span id="apollonian-gasket-source-1"></span> Ronald L. Graham, Jeffrey C. Lagarias, Colin L. Mallows, Allan R. Wilks and Catherine H. Yan, [Apollonian Circle Packings: Geometry and Group Theory I](https://arxiv.org/pdf/math/0010298), 2005 version, §2. Descartes configurations and linear replacements. [Back](#apollonian-gasket-ref-1)
2. <span id="apollonian-gasket-source-2"></span> Graham, Lagarias, Mallows, Wilks and Yan, [Apollonian Circle Packings: Number Theory](https://arxiv.org/abs/math/0009113), Journal of Number Theory 100 (2003), 1–45. Integer-curvature packings. [Back](#apollonian-gasket-ref-2)
3. <span id="apollonian-gasket-source-3"></span> Curtis T. McMullen, [Hausdorff Dimension and Conformal Dynamics III: Computation of Dimension](https://dash.harvard.edu/server/api/core/bitstreams/7312037c-490c-6bd4-e053-0100007fdf3b/content), American Journal of Mathematics 120 (1998), 691–721. Numerical dimension of the residual set. [Back](#apollonian-gasket-ref-3)
