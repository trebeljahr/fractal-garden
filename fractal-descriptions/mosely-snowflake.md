# Mosely Snowflake

The Mosely Snowflake is a three-dimensional cube fractal. Start with a cube, divide it into `3 x 3 x 3` smaller cubes, and then keep only a carefully chosen subset of them. Repeating that step builds a branching solid that looks part crystal, part snowflake.

Two common versions are usually shown. The **heavier** version keeps every small cube except the eight corner cubes, so it contains `19` cubes at each stage. The **lighter** version removes the center cube as well, leaving `18` cubes instead. That small difference changes the silhouette quite a bit, which is why it is interesting to switch between both versions.

It belongs to the same family of recursive cube fractals as the [2D Vicsek Fractal](/vicsek-fractal-2d), the [3D Vicsek Fractal](/vicsek-fractal-3d), and the [Menger Sponge](/menger-sponge), just with its own denser rule for which cubes survive each step. The idea is also closely related to the [Sierpinski Carpet](/sierpinski-carpet): both begin with a regular grid and then keep only certain cells while the construction repeats at smaller and smaller scales.

## Explore the interior

Choose **Explore inside**, then click the view to capture the mouse. Move the mouse to look around without holding a button. Use WASD to fly, Q/E to move down or up, and Shift to fly faster. Press Esc to release the mouse and reach the page controls. Scroll to move forward or backward. On a touch screen, drag to look, pinch to move, or hold the movement buttons. Drag controls also work when mouse capture is unavailable.

Smaller subdivisions appear near visible surfaces. Movement slows as you approach them. This view adds local detail instead of building the whole shape at every level. Detail smaller than a few screen pixels is omitted, and difficult views can draw more coarsely. Choose **Back outside** to return to the whole shape.
