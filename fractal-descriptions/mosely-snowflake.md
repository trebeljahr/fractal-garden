# Mosely Snowflake

The Mosely Snowflake is a three-dimensional cube fractal. Start with a cube, divide it into `3 x 3 x 3` smaller cubes, and then keep only a carefully chosen subset of them. Repeating that step builds a branching solid that looks part crystal, part snowflake.

Two common versions are usually shown. The **heavier** version keeps every small cube except the eight corner cubes, so it contains `19` cubes at each stage. The **lighter** version removes the center cube as well, leaving `18` cubes instead. Removing the center creates interior cavities that open into snowflake-shaped holes as the construction repeats.

It belongs to the same family of recursive cube fractals as the [2D Vicsek Fractal](/vicsek-fractal-2d), the [3D Vicsek Fractal](/vicsek-fractal-3d), and the [Menger Sponge](/menger-sponge), just with its own denser rule for which cubes survive each step. The idea is also closely related to the [Sierpinski Carpet](/sierpinski-carpet): both begin with a regular grid and then keep only certain cells while the construction repeats at smaller and smaller scales.

## A Koch snowflake inside the cubes

<figure data-article-images="mosely-koch"></figure>

Look along a cube's body diagonal, from one corner toward the opposite corner. From this direction, a cube has a hexagonal outline. Repeatedly removing its corner cubes turns that outline into the boundary of a [Koch Snowflake](/l-system/koch-snowflake).

The connection comes from the construction. Each smaller cube projects to a smaller hexagon, with one third of the original width. Their overlapping projections leave an outline that approaches the same Koch boundary as the familiar construction with triangles. Projecting the cubes preserves their scale and placement, so the relationship continues at every level.

In the **Airy lattice**, the missing center cubes create a second way to find that outline: through the holes. At first, neighboring cubes enclose each central cavity. Later subdivisions remove those neighbors' corners, opening views into the cavity and through to the other side. As more corners disappear, the holes develop smaller snowflake details. A dark snowflake-shaped opening during a fly-through can reveal this geometry.

The exact Koch relationship describes an orthographic view along a body diagonal, with parallel viewing rays. Explore inside uses perspective, so your position and viewing direction change the apparent outline. The view also omits detail below its drawing limit. A fly-through therefore shows a finite, potentially distorted version of the pattern.

Eric Baird describes both the outer profile in [The Impossible Snowflake](https://alt-fractals.blogspot.com/2011/04/impossible-snowflake.html) and the holes in [A Koch Snowflake Sponge](https://alt-fractals.blogspot.com/2011/05/koch-snowflake-sponge.html). Both accounts date from 2011. The wider study of how fractals appear under projection is an established part of fractal geometry. [Sixty Years of Fractal Projections](https://arxiv.org/abs/1411.3156) surveys that field. Its general dimension theorems concern typical viewing directions; this particular Koch outline follows from the cube construction and diagonal alignment.

## Explore the interior

Choose **Explore inside**, then click the view to capture the mouse. Move the mouse to look around without holding a button. Use WASD to fly, Space to go up, C to go down, and hold Shift to fly faster. Press Esc to release the mouse and reach the page controls. Scroll to move forward or backward. At the opening distance, scroll out again to move down the page.

On a touch screen, use the left stick to move and the right stick to look. Hold Up or Down to change height, and Fast to fly faster. Dragging the view and pinching also work. Drag controls also work when mouse capture is unavailable.

Smaller subdivisions appear near visible surfaces. Movement slows as you approach them. This view adds local detail instead of building the whole shape at every level. Fog hides distant geometry and draws closer as you approach smaller details. Nearby detail follows the screen resolution. Choose **Back outside** to return to the whole shape.
