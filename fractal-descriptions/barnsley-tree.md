# Barnsley's Tree

This picture comes from a rule with two moves.<sup><a id="barnsley-tree-ref-1" href="#barnsley-tree-source-1">1</a></sup> First, move the point one unit toward the vertical axis: a point on the right moves left by 1, a point on the left moves right by 1. Second, multiply by $c = 0.6 + 1.1i$. That multiplication turns the point about 61 degrees around zero and stretches its distance from zero by about 1.25.

Follow a point. The dotted line is the first move, the arc is the second.

<figure data-orbit="barnsley-tree"></figure>

Stay on one side and the two moves add up to one spiral: each jump turns and stretches around a fixed center at about $(0.71, -0.80)$ on the right, or $(-0.71, 0.80)$ on the left.<sup><a id="barnsley-tree-ref-2" href="#barnsley-tree-source-2">2</a></sup> Each time a point crosses the axis, it switches to the other spiral. That single sharp edge is what cuts the picture into scrolls.

The colors count jumps until the point first leaves a circle of radius 2. This page opens with that radius because MathWorld's picture uses it.<sup><a id="barnsley-tree-ref-3" href="#barnsley-tree-source-1">1</a></sup> Now here is the catch: a point outside that circle can come back in. The count tells you when a point first crossed a line, not where it ended up.

Make the circle bigger.

<figure data-lesson="barnsley-radius"></figure>

Past a radius of about 5, a point that leaves can never return, because the stretch beats the one-unit move.<sup><a id="barnsley-tree-ref-4" href="#barnsley-tree-source-3">3</a></sup> With that circle, the scrolls are gone. All those colored pixels belonged to one solid shape of points that never leave. The scrolls showed how points wander around inside it.

Change $c$ to see other shapes. At $c = 1 + i$ the stretch is about 1.41, large enough that most points leave for good, and the picture splits into two curled shapes.

## Further exploring

- [Julia set](/julia-set), the same kind of picture with a squaring rule

## Sources and notes

1. <span id="barnsley-tree-source-1"></span> [Barnsley's Tree](https://mathworld.wolfram.com/BarnsleysTree.html). [Back](#barnsley-tree-ref-1) [Back](#barnsley-tree-ref-3)
2. <span id="barnsley-tree-source-2"></span> Calculation. On the right the rule is $z \to c(z - 1)$, which leaves $z = c/(c-1)$ fixed. [Back](#barnsley-tree-ref-2)
3. <span id="barnsley-tree-source-3"></span> Calculation. A jump gives $|z'| \ge |c|(|z| - 1)$, which exceeds $|z|$ once $|z| > |c|/(|c| - 1) \approx 4.95$. [Back](#barnsley-tree-ref-4)
