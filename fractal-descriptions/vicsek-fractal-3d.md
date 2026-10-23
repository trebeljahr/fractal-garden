# 3D Vicsek Fractal

The 3D Vicsek Fractal takes the same idea as the [2D Vicsek Fractal](/vicsek-fractal-2d) and lifts it into space. Start with a cube, divide it into `3 x 3 x 3` smaller cubes, and then keep only the center cube together with the six cubes that touch the middle of each face. Repeat that step on every surviving cube, and a branching three-dimensional cross begins to form.

<figure data-investigation="vicsek-fractal-3d"></figure>

Because only seven cubes survive at each stage, the structure stays surprisingly open even after several iterations. That is why it is sometimes also called a **Menger flake**: it belongs to the same family of cube-based recursive solids as the [Mosely Snowflake](/mosely-snowflake) and the [Menger Sponge](/menger-sponge), but it keeps a much smaller set of cubes at every step.

It is also a nice example of how a very simple 2D recursion can turn into a very different object in 3D. The square cross from the 2D page becomes a spatial lattice here, with tunnels and arms that only really become obvious once the solid starts to rotate.

## Thin arms replace solid walls

The six arms connect through the central cube. Their side faces open onto empty space rather than the broad perforated walls of a Menger sponge.

Each arm contains a smaller cross. Large empty regions remain between the arms at every stage.

The construction becomes sparser by volume at every scale, even as the number of connected pieces increases.

## Seven cubes cast a five-square shadow

Look straight along one of the cube's axes using parallel viewing rays. The front, central and back cubes overlap in the shadow. The seven surviving cubes therefore occupy five square positions: a Greek cross.

Projection preserves the one-third scale of each copy. Repeating the construction gives exactly the **Greek cross** variant of the [2D Vicsek fractal](/vicsek-fractal-2d). The diagonal-cross variant on that page uses a different arrangement.

<figure data-projection="vicsek"></figure>

This connection follows directly from the seven cube positions used here. It explains why counting copies gives different dimensions: the 3D construction keeps seven, while its shadow has five distinct positions. The full explorer uses perspective, so its near and far cubes have different apparent sizes. The diagram shows the exact orthographic shadow.
