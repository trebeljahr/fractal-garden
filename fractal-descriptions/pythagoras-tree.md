# Pythagoras Tree

Place a right triangle on a square's top edge, using that edge as the hypotenuse. Build a square on each remaining triangle side. Repeat on both child squares.

<figure data-lesson="pythagoras"></figure>

For parent side $s$ and triangle angle $\theta$, the child sides are

$$
s_1=s\cos\theta,\qquad s_2=s\sin\theta.
$$

Their areas add to $s^2$ because $\cos^2\theta+\sin^2\theta=1$. Every generation therefore has the same sum of square areas, even for an asymmetric tree. At 30 degrees, the child areas divide in the ratio $3:1$. At 45 degrees, both sides equal $s/\sqrt2$.

## Infinite counted area, finite covered area

After $n$ forks, the drawing contains $2^{n+1}-1$ square instances. Adding their individual areas gives $(n+1)s^2$. That sum counts overlaps repeatedly.

For the symmetric 45-degree tree, the entire construction fits inside a rectangle six parent sides wide and four high. Its covered area remains finite.<sup><a id="pythagoras-tree-ref-1" href="#pythagoras-tree-source-1">1</a></sup> The growing count and bounded rectangle cannot both describe disjoint squares: deeper generations must overlap.

Toby Cathcart Burn computes the exact covered area as a **rational number**, approximately $14.6133694787$ times the initial square's area.<sup><a id="pythagoras-tree-ref-2" href="#pythagoras-tree-source-2">2</a></sup> The reduced numerator and denominator each exceed one hundred digits. His method replaces the infinitely many overlaps with a finite automaton and solves the resulting equations.

That value applies to the symmetric tree made from squares alone. Filling every triangular gap gives a different set. Other fork angles also change the overlap pattern and covered area.

The [fractal canopy](/fractal-canopy) repeats line segments. The [T-square fractal](/t-square-fractal) accumulates squares at four corners, with another distinction between counted area and covered area.

## Sources and notes

1. <span id="pythagoras-tree-source-1"></span> Gerard and contributors, [What is known about the area of the symmetric Pythagorean tree?](https://mathoverflow.net/questions/129580/what-is-known-about-the-area-of-the-symmetric-pythagorean-tree), MathOverflow, 2013 onward. Bounding rectangle, overlap problem and subsequent exact calculation. [Back](#pythagoras-tree-ref-1)
2. <span id="pythagoras-tree-source-2"></span> Toby Cathcart Burn, [The Area of the Pythagoras Tree](https://penteract.github.io/pythagTree.html), 2022. Original exact calculation for the symmetric square-only tree using an automaton. Decimal value follows from his displayed fraction. [Back](#pythagoras-tree-ref-2)
