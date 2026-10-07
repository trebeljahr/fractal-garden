# Jerusalem Cube

The Jerusalem Cube is a close cousin of the [Menger Sponge](/menger-sponge), but it plays by a stranger rule. Instead of cutting a cube into a neat `3 x 3 x 3` grid, you cut a cross through every face of the cube. What remains are eight cubes in the corners and twelve smaller cubes sitting in the middle of each edge. Then you repeat that same cut on every cube that is left.

The name comes from the cross-shaped holes, which look like a [Jerusalem cross](https://en.wikipedia.org/wiki/Jerusalem_cross) on every face. The object was first described by Eric Baird in 2011.

The fun part is the scale factor. The corner cubes are scaled by

$$
k = \sqrt{2} - 1 \approx 0.414
$$

and the edge cubes are scaled by $k^2 \approx 0.172$. Along one edge of the big cube you get a corner cube, an edge cube and another corner cube, and these fit together perfectly because

$$
k + k^2 + k = 2(\sqrt{2} - 1) + (3 - 2\sqrt{2}) = 1.
$$

Because $k$ is irrational, the cubes never line up on a regular grid. That is why this page cannot use the voxel grid of the [Menger Sponge](/menger-sponge), the [Mosely Snowflake](/mosely-snowflake) or the [3D Vicsek Fractal](/vicsek-fractal-3d). It places each cube by position and size instead.

Since there are two different scale factors, the copies have different "ages". A corner cube is one step smaller than its parent (rank $+1$), an edge cube is two steps smaller (rank $+2$). In this viewer, an iteration splits every cube whose rank is still below the iteration count, so all cubes on screen end up with a similar size.

The Hausdorff dimension $D$ is the solution of

$$
8 k^D + 12 k^{2D} = 1,
$$

which gives $D \approx 2.529$. That is a bit lower than the Menger Sponge's $\ln 20 / \ln 3 \approx 2.727$, so the Jerusalem Cube is the more hollow of the two.
