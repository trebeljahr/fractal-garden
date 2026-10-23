# 3D Vicsek Fractal

The 3D Vicsek Fractal takes the same idea as the [2D Vicsek Fractal](/vicsek-fractal-2d) and lifts it into space. Start with a cube, divide it into `3 x 3 x 3` smaller cubes, and then keep only the center cube together with the six cubes that touch the middle of each face. Repeat that step on every surviving cube, and a branching three-dimensional cross begins to form.

Because only seven cubes survive at each stage, the structure stays surprisingly open even after several iterations. That is why it is sometimes also called a **Menger flake**: it belongs to the same family of cube-based recursive solids as the [Mosely Snowflake](/mosely-snowflake) and the [Menger Sponge](/menger-sponge), but it keeps a much smaller set of cubes at every step.

It is also a nice example of how a very simple 2D recursion can turn into a very different object in 3D. The square cross from the 2D page becomes a spatial lattice here, with tunnels and arms that only really become obvious once the solid starts to rotate.

## Explore the interior

Choose **Explore inside**, then click the view to capture the mouse. Move the mouse to look around without holding a button. Use WASD to fly, Q/E to move down or up, and Shift to fly faster. Press Esc to release the mouse and reach the page controls. Scroll to move forward or backward. On a touch screen, drag to look, pinch to move, or hold the movement buttons. Drag controls also work when mouse capture is unavailable.

Smaller subdivisions appear near visible surfaces. Movement slows as you approach them. This view adds local detail instead of building the whole shape at every level. Detail smaller than a few screen pixels is omitted, and difficult views can draw more coarsely. Choose **Back outside** to return to the whole shape.
