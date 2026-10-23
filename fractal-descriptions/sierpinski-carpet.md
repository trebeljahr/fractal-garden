# Sierpinski Carpet

Look for a square hole surrounded by eight smaller copies of the same pattern. Each copy contains another hole, with still smaller holes around it. The Sierpinski carpet repeats this arrangement at every scale.

## Make the first few cuts

Start with a filled square. Divide it into a three-by-three grid and remove the middle square. Apply the same cut to each of the eight remaining squares.

<figure data-construction="carpet"></figure>

In the full explorer, open **Fractal Studio Controls** and turn off **Animate growth** to hold a stage still. Change **Depth** to compare the large central hole with the next ring of smaller holes. **Hole color** makes the removed regions easier to separate from the remaining material.

<figure data-article-images="carpet"></figure>

## Zero area does not mean empty

Each cut keeps eight ninths of the previous area. After $n$ cuts, the fraction left is:

$$
A_n = \left(\frac{8}{9}\right)^n
$$

That fraction tends to zero as the number of cuts grows without limit. The carpet still contains points, including its entire outer border. Zero area describes how much surface it covers, not whether anything exists there. Every finite stage on this screen still has positive area.

The [Menger sponge](/menger-sponge) applies a related removal rule to cubes. The [2D Vicsek fractal](/vicsek-fractal-2d) uses the same three-by-three grid but keeps only five squares.

## A carpet can be a 3D shadow

The [Menger sponge](/menger-sponge) projects to this carpet when viewed straight along a cube axis with parallel rays. Its depth collapses onto the plane. The rule for a surviving projected square is the same rule used here: remove the middle cell, then repeat.

A diagonal slice through that same sponge reveals six-pointed star holes instead. The Menger explanation includes an interactive comparison. Projection combines a whole line of sight; slicing keeps one plane.
