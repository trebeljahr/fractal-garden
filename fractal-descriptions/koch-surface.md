# Koch Surface

The Koch Surface is the [Koch Snowflake](/l-system/koch-snowflake) idea moved into 3D. The snowflake takes a line, cuts it into thirds, and raises a small triangle on the middle third. The surface does the same thing to a triangle: split it into four smaller triangles by connecting the midpoints of its sides, then replace the middle one with a small tetrahedron that pokes out of the surface.

Each step turns one triangle into six: the three corner triangles that stay flat, and the three walls of the new tetrahedron. All six are half the size of the original, so the Hausdorff dimension is

$$
D = \frac{\log 6}{\log 2} \approx 2.585
$$

That is more than 2 and less than 3. The surface stays a surface, but it gets so crinkled that it starts to fill space. Its area grows by a factor of $\tfrac{6}{4} = 1.5$ at every step and so goes to infinity, just like the length of the [Koch Snowflake](/l-system/koch-snowflake) boundary.

There are two starting shapes here. The single triangle shows the rule on its own. The tetrahedron applies the rule to all four faces at once, which is the 3D cousin of starting the snowflake from a triangle instead of a line. Watch what happens to the outline as it grows: the spikes fill in more and more of a cube that has the original tetrahedron's corners as four of its eight corners.

For other 3D shapes built from tetrahedra, see the [Sierpinski Tetrahedron](/sierpinski-tetrahedron), which cuts tetrahedra away instead of adding them. The flat [Quadratic Snowflake](/l-system/quadratic-snowflake) uses the same "add a bump to the middle" rule with squares.
