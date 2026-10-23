# Jerusalem Cube

The Jerusalem Cube is a close cousin of the [Menger Sponge](/menger-sponge), but it plays by a stranger rule. Instead of cutting a cube into a neat `3 x 3 x 3` grid, you cut a cross through every face of the cube. What remains are eight cubes in the corners and twelve smaller cubes sitting in the middle of each edge. Then you repeat that same cut on every cube that is left.

<figure data-investigation="jerusalem-cube"></figure>

The name comes from the cross-shaped holes, which look like a [Jerusalem cross](https://en.wikipedia.org/wiki/Jerusalem_cross) on every face. The object was first described by Eric Baird in 2011.

The fun part is the scale factor. The corner cubes are scaled by

$$
k = \sqrt{2} - 1 \approx 0.414
$$

and the edge cubes are scaled by $k^2 \approx 0.172$. Along one edge of the big cube you get a corner cube, an edge cube and another corner cube, and these fit together perfectly because

$$
k + k^2 + k = 2(\sqrt{2} - 1) + (3 - 2\sqrt{2}) = 1.
$$

The irrational scale prevents a single equal-cell grid from describing every generation. Corner cubes and edge cubes keep their two distinct sizes.

Since there are two different scale factors, the copies have different "ages". A corner cube is one step smaller than its parent (rank $+1$), an edge cube is two steps smaller (rank $+2$). In this viewer, an iteration splits every cube whose rank is still below the iteration count, so all cubes on screen end up with a similar size.

The Hausdorff dimension $D$ is the solution of

$$
8 k^D + 12 k^{2D} = 1,
$$

which gives $D \approx 2.529$. That is a bit lower than the Menger Sponge's $\ln 20 / \ln 3 \approx 2.727$, so the Jerusalem Cube is the more hollow of the two.

## The Jerusalem square is its shadow

Project the cube straight onto one of its face planes with parallel rays. Front and back copies overlap, leaving a planar pattern called the **Jerusalem square**. Its cross-shaped gaps inherit the same two scales, $k$ and $k^2$, as the solid.

This is the irrational-scale counterpart of the [Menger sponge's carpet shadow](/menger-sponge). Eric Baird describes the relationship in [The Jerusalem Square](https://alt-fractals.blogspot.com/2011/11/jerusalem-square.html). In a face-on perspective view, near and far pieces still differ in apparent size. An orthographic shadow uses parallel rays and removes that size difference.
