# 2D Vicsek Fractal

Look for five squares arranged as a cross, then five smaller squares inside each of those. The Vicsek fractal repeats one layout at a third of the previous size.

<figure data-investigation="vicsek-fractal-2d"></figure>

## Compare two crosses

At the first replacement, only five cells of a three-by-three grid survive. The arrangement decides which gaps repeat.

The diagonal cross keeps four corners and the center. The Greek cross keeps the center and its four side neighbors.

Both layouts keep the same number of squares at each stage. Their area and scaling dimension agree, although their gaps have different positions.

## What stays the same

After $n$ replacements, there are $5^n$ squares. Their side length is $1/3^n$ of the original. The remaining fraction of area is:

$$
A_n = \left(\frac{5}{9}\right)^n
$$

The fraction tends to zero as the steps continue without limit. The dimension is $\log(5)/\log(3)$, about 1.465, for either layout. Counting copies alone does not tell you their arrangement.

The [Sierpinski carpet](/sierpinski-carpet) keeps eight cells in the same grid. The [3D Vicsek fractal](/vicsek-fractal-3d) uses seven cubes in a three-dimensional cross.

## A cross hidden in a 3D shadow

The **Greek cross** layout is the face-on orthographic shadow of this garden's [3D Vicsek fractal](/vicsek-fractal-3d). Three cubes align along the viewing axis and merge into the central projected square. Four other cubes form its arms.

Seven 3D copies therefore become five distinct 2D copies. Because this happens again at every scale, the relationship holds for the full fractals, as well as their finite stages. The 3D explanation includes the projected construction.
