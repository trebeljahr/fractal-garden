# T-Square Fractal

Look for a large square with smaller squares centered on its corners. Those squares carry another set of corner squares. The overlaps and the gaps between them create the stepped outline.

<figure data-investigation="t-square-fractal"></figure>

## Follow the corner copies

Start with one square. Put a smaller square at each of its four corners, keeping the original square. Apply the same rule to each new square.

Keeping every parent makes this an accumulating construction. The new squares overlap material that earlier generations already occupy.

At a child scale of 0.5, each new square has half its parent’s side length. Larger scales produce larger overlaps around the corners.

## More squares than visible regions

Generation $n$ adds $4^n$ squares before accounting for overlap. At child scale $r$, each square's side length is:

$$
s_n = s_0r^n
$$

Some squares cover parts of others, so the number of drawn squares does not count separate visible pieces. The overlaps also make a sum of their areas different from the area of their union.

The [Sierpinski carpet](/sierpinski-carpet) removes middle squares from a grid. The [2D Vicsek fractal](/vicsek-fractal-2d) replaces a square with five smaller squares. Comparing them shows how the placement rule changes the empty space.
