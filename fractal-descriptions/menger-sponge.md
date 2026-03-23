# Menger Sponge

The Menger Sponge is the three-dimensional analogue of the [Sierpinski Carpet](/sierpinski-carpet). Start with a cube, divide it into `3 x 3 x 3` smaller cubes, and remove the center cube together with the six cubes in the middle of each face. Then repeat that same rule on every cube that remains.

That means `20` cubes survive at every step, so the shape becomes much denser than the [3D Vicsek Fractal](/vicsek-fractal-3d), which keeps only seven cubes, and more regular than the [Mosely Snowflake](/mosely-snowflake), which uses slightly different cube-removal rules. Even so, all three belong to the same recursive voxel family.

One of the most surprising facts about the Menger Sponge is that its volume tends to `0` while its surface area grows without bound. That makes it a perfect example of how fractals can look like solid objects and still behave in very counterintuitive ways once the recursion continues indefinitely.
