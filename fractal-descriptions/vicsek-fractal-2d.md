# 2D Vicsek Fractal

Look for five squares arranged as a cross, then five smaller squares inside each of those. The Vicsek fractal repeats one layout at a third of the previous size.

## Compare two crosses

Open **Pattern Studio**, turn off **Animate growth**, and lower **Iterations** to zero. This shows the starting square. At the next step, a three-by-three grid replaces it, with only five cells kept.

Under **Layout**, **Diagonal cross** keeps the four corners and the center. **Greek cross** keeps the center and the four cells beside it. Increase **Iterations** to compare how those choices repeat through the picture.

Use **Outline squares** to separate the small cells. The two layouts keep the same number of squares at every level, even though their gaps occupy different positions.

## What stays the same

After $n$ replacements, there are $5^n$ squares. Their side length is $1/3^n$ of the original. The remaining fraction of area is:

$$
A_n = \left(\frac{5}{9}\right)^n
$$

The fraction tends to zero as the steps continue without limit. The dimension is $\log(5)/\log(3)$, about 1.465, for either layout. Counting copies alone does not tell you their arrangement.

The [Sierpinski carpet](/sierpinski-carpet) keeps eight cells in the same grid. The [3D Vicsek fractal](/vicsek-fractal-3d) uses seven cubes in a three-dimensional cross.
