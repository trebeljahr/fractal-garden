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
