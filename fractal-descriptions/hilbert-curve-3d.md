# 3D Hilbert Curve

The 3D Hilbert Curve is the natural next step after the [2D Hilbert Curve](/l-system/hilbert-curve). Instead of filling a square, it fills a cube. With infinitely many iterations it would pass through every single point inside the cube, so its Hausdorff dimension is $3$, the same as the space it fills.

The construction follows the same idea as in the plane. Split the cube into $2 \times 2 \times 2 = 8$ smaller cubes and visit them in one continuous path, a bit like a 3D version of the u-shape. Then replace every small cube with a smaller, rotated and mirrored copy of the whole path, oriented so that the end of one copy meets the start of the next one. Every iteration multiplies the number of points by $8$, so iteration $n$ has

$$
8^n = 2^{3n}
$$

points. At iteration 5 that is already $32768$ points, one in each cell of a $32 \times 32 \times 32$ grid.

What you see here is not drawn with the L-System renderer like its flat cousin. Instead, every index along the curve is turned into its 3D coordinates directly with [Skilling's algorithm](https://doi.org/10.1063/1.1751381), which uses the [Gray code](https://en.wikipedia.org/wiki/Gray_code) of the index and a few bit flips per level. Lines close to you are drawn brighter than the ones in the back, which makes the octants easier to see when the cube rotates.

Just like in 2D, points that are close together along the curve are also close together in space. That makes 3D Hilbert Curves useful for ordering data in databases and for walking through voxel grids in a cache-friendly way. If you want to see a curve that winds through space without any order at all, have a look at the [Lorenz Attractor](/lorenz-attractor).
