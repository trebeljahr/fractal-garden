# Quadratic Koch Surface

This is the three-dimensional version of the quadratic type 1 Koch curve. In 2D, that curve takes a line segment, splits it into three parts and pushes the middle part out into a square bump. You can see the closed version of it on the [Quadratic Snowflake](/l-system/quadratic-snowflake) page.

In 3D, the same idea works on squares instead of line segments. Start with a cube. Split each square face into a `3 x 3` grid and grow a small cube, a third of the size, out of the middle cell. Now each old face has turned into 13 smaller squares: the 8 flat cells around the bump and the 5 visible faces of the new cube. Repeat the same step on every one of those squares.

Every face on screen at a given iteration has exactly the same size, which is why the surface looks so even, almost like it was built out of Lego. Each step multiplies the number of faces by 13 and shrinks them by a factor of 3, so the Hausdorff dimension is

$$
D = \frac{\ln 13}{\ln 3} \approx 2.335.
$$

That makes it a surface that is "more than two-dimensional", in the same way the [Koch Snowflake](/l-system/koch-snowflake) is a curve with dimension $\ln 4 / \ln 3 \approx 1.262$.

Along each axis the solid grows by $\tfrac{1}{3} + \tfrac{1}{9} + \tfrac{1}{27} + \dots = \tfrac{1}{2}$ of the starting cube's edge on each side, so the finished shape fits inside a cube twice as wide as the one it started from. The surface area, on the other hand, grows by a factor of $\tfrac{13}{9}$ at every step and goes to infinity.

If you like cube-based fractals, compare it with the [Menger Sponge](/menger-sponge), which removes cubes instead of adding them, and the [Jerusalem Cube](/jerusalem-cube).
