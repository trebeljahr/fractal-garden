# Apollonian Gasket

Three touching circles leave a curved triangular gap. Put the largest circle that fits into that gap. It touches all three circles and leaves three smaller gaps. Repeat in those gaps.

The picture below starts with a large circle of radius 1. Inside it sit two circles of radius 1/2 and one of radius 1/3. The number on each circle is its **curvature**: one divided by its radius, so a smaller circle gets a larger number.

The large circle counts as −1 because it bends the other way.<sup><a id="apollonian-gasket-ref-1" href="#apollonian-gasket-source-1">1</a></sup> The small circles bulge into a gap, and the large circle curves around it.

Click or tap a gap to add its circle.

<figure data-lesson="apollonian-curvatures"></figure>

Every new number is whole.<sup><a id="apollonian-gasket-ref-2" href="#apollonian-gasket-source-1">1</a></sup> Press **Fill every gap** five times. You get 488 circles, and the smallest has curvature 927, so its radius is exactly 1/927 of the large circle's.

These numbers come from one rule. Press **Start over** and point at or tap the gap in the middle. The three gold circles, 2, 2 and 3, touch the circle that fits in that gap. They also touch the large circle, shown in blue. Any three touching circles have exactly two other circles that touch all of them.

If you know one of those two circles, you can calculate the other. Add the three curvatures, double the result, then subtract the one you know: $2 \times (2 + 2 + 3) - (-1) = 15$. It works in the other direction too: $2 \times (2 + 2 + 3) - 15 = -1$. The demo shows both lines for any gap or circle.

Every gap has three circles around it and a fourth circle that touches those three, so all four numbers are already on the picture. Doubling, adding and subtracting whole numbers can't make a fraction. Four whole numbers at the start make every later number whole.<sup><a id="apollonian-gasket-ref-3" href="#apollonian-gasket-source-1">1</a></sup>

This is also a way to check the minus sign. The bottom half of the picture is a mirror image of the top half, so the circle in the bottom gap has to be another 3. With −1, the rule gives $2 \times (-1 + 2 + 2) - 3 = 3$. With +1, it gives 7, a circle far too small for that gap.

The rule comes from an equation Descartes found in 1643, in a different form.<sup><a id="apollonian-gasket-ref-4" href="#apollonian-gasket-source-1">1</a>, <a id="apollonian-gasket-ref-7" href="#apollonian-gasket-source-3">3</a></sup>

The first four numbers matter. The explorer on this page starts with three equal circles. Choose **Three equal circles** to see them with the large circle at −1. The others are about 2.15, and every number after the −1 has a $\sqrt{3}$ in it.<sup><a id="apollonian-gasket-ref-6" href="#apollonian-gasket-source-2">2</a></sup>

## Further exploring

### Videos

- [Apollonian Gasket Fractal — The Coding Train](https://www.youtube.com/watch?v=6UlGLB_jiCs)

### Reading

- [Apollonian gasket — Wikipedia](https://en.wikipedia.org/wiki/Apollonian_gasket)
- [Apollonian gasket — MathWorld](https://mathworld.wolfram.com/ApollonianGasket.html)
- [A Tisket, a Tasket, an Apollonian Gasket — American Scientist](https://www.americanscientist.org/article/a-tisket-a-tasket-an-apollonian-gasket)
- [Apollony Fractal — Paul Bourke](https://paulbourke.net/fractals/apollony/)

## Sources and notes

1. <span id="apollonian-gasket-source-1"></span> [Apollonian Circle Packings: Number Theory](https://arxiv.org/abs/math/0009113). [Back](#apollonian-gasket-ref-1) [Back](#apollonian-gasket-ref-2) [Back](#apollonian-gasket-ref-3) [Back](#apollonian-gasket-ref-4)
2. <span id="apollonian-gasket-source-2"></span> Calculation. With the large circle at −1 the equal circles have curvature $x = 1 + 2/\sqrt{3}$. The rule writes every later curvature as $m + nx$ with whole numbers $m$ and $n$, and $n$ stays at least 1, so the $\sqrt{3}$ never cancels. Rescaling multiplies every curvature by the same number, and −1 and $x$ can't both become whole because $x$ is not a fraction. [Back](#apollonian-gasket-ref-6)
3. <span id="apollonian-gasket-source-3"></span> Calculation: four circles that all touch each other satisfy $(a+b+c+d)^2=2(a^2+b^2+c^2+d^2)$. Solving for $d$ gives $d=a+b+c\pm2\sqrt{ab+bc+ca}$, one answer for each of the two circles. The two answers total $2(a+b+c)$, which is the rule. For three equal circles of curvature 1 the answers are $3\pm2\sqrt3$. [Back](#apollonian-gasket-ref-7)
