# Fractal Canopy

Follow a branch from the trunk to its tip. Each fork starts smaller branches with the same arrangement of forks. The canopy's outline comes from the branch angle, the number of branches and how quickly they shrink.

## Grow a small tree

This example uses two branches at each tip. Step forward to add a generation, then change the angle to open or close the canopy.

<figure data-construction="canopy"></figure>

The full explorer supports more branches and different length ratios. In **Fractal Studio Controls**, turn off **Animate angle** before making a comparison. Lower **Depth** to see the main forks. Increase **Branches** to place more branches at each tip.

**Branch shrink** sets each child's length as a fraction of its parent's length. Smaller values keep the outer branches close to their parent. Larger values make the canopy spread farther and can cause branches to overlap.

## The same rule, different outlines

Under **Starting shape**, compare **Classic canopy** with **Broccoli bloom** and **Triangle tower**. These presets change several values together. They show how one branching procedure can create plant-like, triangular or snowflake-like outlines.

For a two-branch tree, the number of new branches at generation $n$ is $2^n$. If the length ratio is $r$, each new branch has length:

$$
L_n = L_0 r^n
$$

This is a geometric model of repeated branching. Real trees also respond to growth, light and their surroundings. The [Pythagoras tree](/pythagoras-tree) repeats squares around right triangles, while the [Barnsley fern](/barnsley-fern) uses repeated transformations of points.
