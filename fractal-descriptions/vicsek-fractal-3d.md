# 3D Vicsek Fractal

The 3D Vicsek Fractal takes the same idea as the [2D Vicsek Fractal](/vicsek-fractal-2d) and lifts it into space. Start with a cube, divide it into `3 x 3 x 3` smaller cubes, and then keep only the center cube together with the six cubes that touch the middle of each face. Repeat that step on every surviving cube, and a branching three-dimensional cross begins to form.

Because only seven cubes survive at each stage, the structure stays surprisingly open even after several iterations. That is why it is sometimes also called a **Menger flake**: it belongs to the same family of cube-based recursive solids as the [Mosely Snowflake](/mosely-snowflake) and the [Menger Sponge](/menger-sponge), but it keeps a much smaller set of cubes at every step.

It is also a nice example of how a very simple 2D recursion can turn into a very different object in 3D. The square cross from the 2D page becomes a spatial lattice here, with tunnels and arms that only really become obvious once the solid starts to rotate.
