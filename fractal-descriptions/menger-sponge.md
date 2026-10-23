# Menger Sponge

Rotate the cube to look through its square tunnels. Large openings cross the whole sponge, while smaller openings repeat in the surrounding walls. Each surviving block is a smaller copy of the same construction.

## Follow one round of removal

Split a cube into 27 equal cubes in a three-by-three-by-three grid. Remove the central cube and the cube at the center of each of its six faces. Twenty cubes remain. Repeat the same removal inside every remaining cube.

<figure data-lesson="menger"></figure>

A face of the sponge shows the square-hole pattern of the [Sierpinski carpet](/sierpinski-carpet). The tunnels connect those faces through the interior.

Open **Fractal Studio Controls** and turn off **Animate growth** to compare levels with **Iterations**. Disable **Auto rotate** when you want to hold a view still. Drag to rotate, and use the scroll wheel to move closer. Compare **Solid faces** with **Wireframe** to see how the smaller blocks fit together.

<figure data-article-images="menger"></figure>

## A solid-looking shape with vanishing volume

Every step keeps twenty twenty-sevenths of the previous volume. Starting with a unit cube, the remaining volume after $n$ steps is:

$$
V_n = \left(\frac{20}{27}\right)^n
$$

It approaches zero as the number of steps grows without limit. The exposed surface area grows without bound. The on-screen sponge is a finite approximation, with positive volume and a finite number of faces.

The [3D Vicsek fractal](/vicsek-fractal-3d) keeps seven cubes per step. The [Mosely snowflake](/mosely-snowflake) removes different cubes, producing a different arrangement of openings.

## Explore the interior

Choose **Explore inside**, then click the view to capture the mouse. Move the mouse to look around without holding a button. Use WASD to fly, Space to go up, C to go down, and hold Shift to fly faster. Press Esc to release the mouse and reach the page controls. Scroll to move forward or backward. At the opening distance, scroll out again to move down the page.

On a touch screen, use the left stick to move and the right stick to look. Hold Up or Down to change height, and Fast to fly faster. Dragging the view and pinching also work. Drag controls also work when mouse capture is unavailable.

Smaller subdivisions appear near visible surfaces. Movement slows as you approach them. This view adds local detail instead of building the whole shape at every level. Fog hides distant geometry and draws closer as you approach smaller details. Nearby detail follows the screen resolution. Choose **Back outside** to return to the whole shape.

## A carpet shadow and stars inside a slice

A face-on orthographic shadow of the sponge is a [Sierpinski carpet](/sierpinski-carpet). Cubes at different depths overlap on the screen. A projected square survives exactly when its two coordinates never both fall in a middle third at the same subdivision.

A diagonal cut gives a different surprise: a hexagon with six-pointed star holes. Cut through the centre, perpendicular to a body diagonal. Three families of square tunnels intersect that plane at different angles, forming the stars. The smaller tunnels repeat them at smaller scales.

<figure data-projection="menger"></figure>

Switch between the face-on shadow and the diagonal slice above. A shadow combines material along a whole viewing ray. A slice keeps only material on one plane. Looking diagonally through the full sponge does not reveal the same pattern as cutting it open.

[George Hart demonstrates the star-filled slice](https://www.simonsfoundation.org/2012/12/10/mathematical-impressions-the-surprising-menger-sponge-slice/). [Zachary Abel derives its recursive structure](https://blog.zacharyabel.com/2012/02/seeing-stars/). The [Mosely snowflake](/mosely-snowflake) produces Koch-shaped openings from a different cube-removal rule.
