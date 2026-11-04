# Fractal Canopy

A branch ends in several shorter branches. Each of those branches ends in the same arrangement. Repeating this rule produces the canopy.

The **Classic canopy** uses three branches at each tip. Each is 60% as long as its parent, a length ratio of 60%, with 43 degrees between neighboring directions.

The figure uses two branches per tip, so the tree above the trunk has a left half and a right half. Make the branches longer and the halves grow toward each other. For each angle between the branches, exactly one length ratio makes them just touch.<sup><a id="fractal-canopy-ref-1" href="#fractal-canopy-source-1">1</a></sup>

<figure data-construction="canopy"></figure>

The figure opens at 120°. Drag the length ratio up. Below 61.8%, a gap stays between the halves. At 61.8% they touch. Above it, they cross.<sup><a id="fractal-canopy-ref-2" href="#fractal-canopy-source-2">2</a></sup> Move the angle and the touching ratio moves too, from 50.8% at 20° to 70.7% at 180°, where the tree is the [H tree](/h-tree) on a trunk.<sup><a id="fractal-canopy-ref-3" href="#fractal-canopy-source-3">3</a></sup>

Why 61.8% at 120°? The halves are mirror images across the dashed line, so they touch where one half reaches that line. The blue route is the part of the right half that comes closest to it. At 120°, each branch on this route either goes straight up or moves sideways by the same share of its length.

The route's first branch is 61.8% of a trunk long and moves right. The second is 38.2% and goes straight up. All the others move left: 23.6%, 14.6%, 9.0%, 5.6% and so on. Those left-moving lengths add up to exactly 61.8%, so the route ends on the line.<sup><a id="fractal-canopy-ref-4" href="#fractal-canopy-source-4">4</a></sup>

The route comes back exactly because each length is the sum of the next two, as in 61.8 = 38.2 + 23.6. Only one ratio does that: one over the golden ratio, 1 ÷ 1.618 = 0.618.

A drawing has to stop, so its route stops short of the line. **Gap at this step** shows what is left at the touching ratio: 0.253 trunks at step 5 and 0.009 at step 12. Only the tree that never stops has no gap.

## Further exploring

### Videos

- [Fractal Trees - Recursive — The Coding Train](https://www.youtube.com/watch?v=0jjeOYMjmDU)

### Reading

- [Fractal canopy — Wikipedia](https://en.wikipedia.org/wiki/Fractal_canopy)
- [Self-contacting tree animations — Benoit Mandelbrot and Michael Frame](https://www.math.union.edu/research/fractaltrees/FractalTreesAnim.html)
- [Recursive trees — The Nature of Code](https://natureofcode.com/fractals/#trees)

## Sources and notes

1. <span id="fractal-canopy-source-1"></span> [Self-Contacting Scaling](https://www.math.union.edu/research/fractaltrees/FractalTreesSC.html). [Back](#fractal-canopy-ref-1)
2. <span id="fractal-canopy-source-2"></span> [Symmetric Binary Trees](https://larryriddle.agnesscott.org/ifs/pythagorean/symbinarytree.htm). [Back](#fractal-canopy-ref-2)
3. <span id="fractal-canopy-source-3"></span> Calculation. For each whole-degree angle from 20° to 180°, the figure's touching ratio matches the formula on the Symmetric Binary Trees page, which measures its angle from the parent branch to one child, half the angle used here. [Back](#fractal-canopy-ref-3)
4. <span id="fractal-canopy-source-4"></span> Calculation. With length ratio $r$, the left-moving lengths are $r^3 + r^4 + \dots = r^3/(1-r)$. Setting this equal to the first branch's $r$ gives $r + r^2 = 1$, so $r = (\sqrt5-1)/2 = 0.618\ldots$ [Back](#fractal-canopy-ref-4)
