# L-System Explorer

A short rewriting rule can grow a plant, fold a curve, or arrange a route through a grid. The symbols determine how each part develops.

## A rule for growth and a rule for drawing

An L-system replaces all symbols at once. Newly inserted symbols wait for the next rewrite before they expand again. Drawing then interprets the resulting word.

<figure data-investigation="l-system-explorer"></figure>

Forward symbols draw strokes. Turns change direction. Brackets save and restore a branch junction. Other symbols can guide future rewrites without drawing anything.

Changing a branch angle can alter the outline while preserving every connection. Changing a production can alter the connections themselves. [The Algorithmic Beauty of Plants](https://algorithmicbotany.org/papers/abop/abop-ch1.pdf) develops both ideas.

The [Koch snowflake](/l-system/koch-snowflake) replaces edges. [Fern 1](/l-system/fern-1) grows bracketed branches. The [3D Hilbert curve](/l-system/hilbert-curve-3d) connects routes through cubes.
