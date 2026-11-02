# Mira Fractal

Pick a point $(x, y)$. It jumps to a new point using this rule, and you plot every landing:<sup><a id="mira-fractal-ref-1" href="#mira-fractal-source-1">1</a></sup>

$$x' = b\,y + F(x), \qquad y' = -x + F(x'), \qquad F(x) = a x + \frac{2(1 - a)x^2}{1 + x^2}$$

One landing tells you nothing. After thousands of landings, a flower appears. The number $a$ changes how many petals you get. **Places to explore** has examples.

The number $b$ decides what happens over time. Take any small patch of points. One jump moves and distorts the patch, but its area comes out multiplied by exactly $b$, whatever the point and whatever $a$ is.<sup><a id="mira-fractal-ref-2" href="#mira-fractal-source-2">2</a></sup>

With $b = 1$, no area is ever lost. With $b = 0.9998$, one jump barely changes anything. After about 3,500 jumps, though, the patch has half its area, and after 100,000 jumps it has almost none.

That changes the picture you get. Start at $(12.1, 0)$ with $a = 0.7$. With $b = 1$, the point keeps reaching about 15 from the center for as long as we ran it. With $b = 0.9998$, it reaches 15 only during its first few thousand jumps. After 10,000 jumps it stays within about 5, and after 20,000 within about 4.<sup><a id="mira-fractal-ref-3" href="#mira-fractal-source-3">3</a></sup>

<figure data-lesson="mira"></figure>

So the long arms are the early part of a slow fall. MathWorld's pictures with $b = 0.9998$ stop after 10,000 jumps, and those arms are all from the time before the point settled in. Plot longer and they fade next to the middle, where new landings keep piling up.

The rule's two-line form is one that Igor Gumowski, at CERN, and Christian Mira, at Toulouse, used to study particle motion in accelerators.<sup><a id="mira-fractal-ref-4" href="#mira-fractal-source-4">4</a></sup>

## Further exploring

- [Lorenz attractor](/lorenz-attractor), another picture drawn by following one route

## Sources and notes

1. <span id="mira-fractal-source-1"></span> [Mira Fractal](https://mathworld.wolfram.com/MiraFractal.html). [Back](#mira-fractal-ref-1)
2. <span id="mira-fractal-source-2"></span> Calculation. The four partial derivatives of the rule are $F'(x)$ and $b$ in the first row, and $F'(x')F'(x) - 1$ and $bF'(x')$ in the second. Their determinant is $b$, so the bends in $F$ cancel out. [Back](#mira-fractal-ref-2)
3. <span id="mira-fractal-source-3"></span> Calculation. Measured on this page's orbit, up to 2,000,000 jumps. Where a falling point ends up is sensitive to tiny differences, so these distances describe this run. [Back](#mira-fractal-ref-3)
4. <span id="mira-fractal-source-4"></span> [Stochastic Effects in Longitudinal Phase Space](https://inspirehep.net/files/0513582dd0305d8373abe2dc3431a54f) uses the same two-line recurrence with a sine in place of this $F$. [Boundaries of Stochasticity Domains in Hamiltonian Systems](https://inspirehep.net/files/f7c8e5a15c72f5ea9cb5803390381a7b) gives the affiliations. [Back](#mira-fractal-ref-4)
