# Fractal Canopy

Follow a branch from the trunk to its tip. Each fork starts smaller branches with the same arrangement of forks. The canopy's outline comes from the branch angle, the number of branches and how quickly they shrink.

## Grow a small tree

This example uses two branches at each tip. Step forward to add a generation, then change the angle to open or close the canopy.

<figure data-construction="canopy"></figure>

A fixed branching rule can produce narrow or spreading canopies. Changing the branch angle changes the outline without changing which branches connect.

The child-to-parent length ratio controls the canopy’s reach. For a ratio below one, the lengths along a single branch form a convergent geometric series.

## The same rule, different outlines

Under **Starting shape**, compare **Classic canopy** with **Broccoli bloom** and **Triangle tower**. These presets change several values together. They show how one branching procedure can create plant-like, triangular or snowflake-like outlines.

For a two-branch tree, the number of new branches at generation $n$ is $2^n$. If the length ratio is $r$, each new branch has length:

$$
L_n = L_0 r^n
$$

This is a geometric model of repeated branching. Real trees also respond to growth, light and their surroundings. The [Pythagoras tree](/pythagoras-tree) repeats squares around right triangles, while the [Barnsley fern](/barnsley-fern) uses repeated transformations of points.
