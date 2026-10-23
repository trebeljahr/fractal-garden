# Mosely Snowflake

The Mosely Snowflake is a three-dimensional cube fractal. Start with a cube, divide it into `3 x 3 x 3` smaller cubes, and then keep only a carefully chosen subset of them. Repeating that step builds a branching solid that looks part crystal, part snowflake.

<figure data-investigation="mosely-snowflake"></figure>

Two common versions are usually shown. The **heavier** version keeps every small cube except the eight corner cubes, so it contains `19` cubes at each stage. The **lighter** version removes the center cube as well, leaving `18` cubes instead. Removing the center creates interior cavities that open into snowflake-shaped holes as the construction repeats.

It belongs to the same family of recursive cube fractals as the [2D Vicsek Fractal](/vicsek-fractal-2d), the [3D Vicsek Fractal](/vicsek-fractal-3d), and the [Menger Sponge](/menger-sponge), just with its own denser rule for which cubes survive each step. The idea is also closely related to the [Sierpinski Carpet](/sierpinski-carpet): both begin with a regular grid and then keep only certain cells while the construction repeats at smaller and smaller scales.

## A Koch snowflake inside the cubes

<figure data-article-images="mosely-koch"></figure>

Look along a cube's body diagonal, from one corner toward the opposite corner. From this direction, a cube has a hexagonal outline. Repeatedly removing its corner cubes turns that outline into the boundary of a [Koch Snowflake](/l-system/koch-snowflake).

The connection comes from the construction. Each smaller cube projects to a smaller hexagon, with one third of the original width. Their overlapping projections leave an outline that approaches the same Koch boundary as the familiar construction with triangles. Projecting the cubes preserves their scale and placement, so the relationship continues at every level.

In the **Airy lattice**, the missing center cubes create a second way to find that outline: through the holes. At first, neighboring cubes enclose each central cavity. Later subdivisions remove those neighbors' corners, opening views into the cavity and through to the other side. As more corners disappear, the holes develop smaller snowflake details. A dark snowflake-shaped opening during a fly-through can reveal this geometry.

The exact Koch relationship describes an orthographic view along a body diagonal, with parallel viewing rays. Explore inside uses perspective, so your position and viewing direction change the apparent outline. The view also omits detail below its drawing limit. A fly-through therefore shows a finite, potentially distorted version of the pattern.

Eric Baird describes both the outer profile in [The Impossible Snowflake](https://alt-fractals.blogspot.com/2011/04/impossible-snowflake.html) and the holes in [A Koch Snowflake Sponge](https://alt-fractals.blogspot.com/2011/05/koch-snowflake-sponge.html). Both accounts date from 2011. The wider study of how fractals appear under projection is an established part of fractal geometry. [Sixty Years of Fractal Projections](https://arxiv.org/abs/1411.3156) surveys that field. Its general dimension theorems concern typical viewing directions; this particular Koch outline follows from the cube construction and diagonal alignment.

## A different removal rule, different passages

Removing corner cubes leaves a different network of passages from the Menger sponge, which removes face centers and the center.

The lighter variant also removes each block’s center. That difference repeats throughout the interior, changing how openings meet.

At smaller scales, each surviving cube repeats the same passage structure.
