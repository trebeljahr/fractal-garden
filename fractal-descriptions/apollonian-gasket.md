# Apollonian Gasket

Look between the large circles for smaller circles that touch their neighbors without overlapping. Each new circle leaves three smaller curved gaps. More circles fit into those gaps, so the same pattern continues at smaller scales.

## Fit a circle into each gap

The explorer starts with three equal circles inside one enclosing circle. All four circles touch one another. The first construction step fills the central gap and the three gaps beside the enclosing circle.

<figure data-construction="apollonian"></figure>

Open **Fractal Studio Controls** and turn off **Animate growth** to inspect a stage. Increase **Iterations** one step at a time. Switch **Fill circles** on to compare the circles' sizes, then use **Outline circles** to follow the gaps.

<figure data-article-images="apollonian"></figure>

## Why every circle fits

Three mutually touching circles bound two possible circles tangent to all three. Once one of those circles is known, the other fills the opposite gap. Repeating this replacement gives the packing its structure.

Descartes' circle theorem expresses that relationship through signed curvature $b$, the reciprocal of the radius. The enclosing circle has negative curvature. For four tangent circles:

$$
(b_1+b_2+b_3+b_4)^2 = 2(b_1^2+b_2^2+b_3^2+b_4^2)
$$

The small circles need their own radii and positions. They do not form equal-size tiles. Compare that with the fixed square grid of the [Sierpinski carpet](/sierpinski-carpet), or the branching copies in the [fractal canopy](/fractal-canopy).
