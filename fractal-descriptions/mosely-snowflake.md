# Mosely Snowflake

Divide a cube into 27 equal cubes. Remove the eight corner cubes and the center cube. Eighteen remain. Repeat inside each remaining cube. The **Center kept** option leaves nineteen instead.

<figure data-construction-player="mosely-snowflake"></figure>

With the center removed, each step keeps $18/27$, or two-thirds, of the previous volume. After ten steps, about 1.7% of the original volume remains. Keep repeating forever and the volume approaches zero. Every finite model still contains solid cubes.

The holes expose more faces inside the shape. Surface area counts these faces too, including those around enclosed holes. Faces where two cubes touch do not count. For a starting cube one unit wide, the surface area is 6 square units. It rises to about 6.67 after the first step and 10.37 after the second. Over further steps, it grows without bound.<sup><a id="mosely-snowflake-ref-1" href="#mosely-snowflake-source-1">1</a></sup>

To understand its dimension, compare how shapes divide into smaller copies. Divide each side of a square into thirds: you get nine smaller squares. Do the same to a solid cube: you get twenty-seven smaller cubes. The snowflake keeps eighteen copies, each one-third as wide. Eighteen lies between nine and twenty-seven, so its dimension lies between two and three.

The exact number is the power you raise 3 to, to get 18: $3^d=18$. This gives $d=\log(18)/\log(3)\approx2.631$. For this construction, it is also the **Hausdorff dimension**, a way to measure dimension by covering a shape with smaller and smaller pieces.<sup><a id="mosely-snowflake-ref-2" href="#mosely-snowflake-source-2">2</a></sup>

The value 2.631 describes the ideal fractal after infinitely many steps. Each finite model has dimension three because its cubes still have thickness.

Keeping the center changes the dimension to about 2.680 and retains $19/27$ of the volume at each step. Its volume still approaches zero, while its surface area grows without bound.

Look toward a corner with **Center kept** selected. A cube has a hexagonal outline from this angle. As the construction repeats, its shadow approaches a filled [Koch snowflake](/l-system/koch-snowflake).<sup><a id="mosely-snowflake-ref-3" href="#mosely-snowflake-source-3">3</a></sup>

<figure data-article-images="mosely-koch"></figure>

You can build a model with business cards. Fold six cards into a cube, then tuck their flaps into neighboring cubes. The USC project called for about 49,000 cards.<sup><a id="mosely-snowflake-ref-4" href="#mosely-snowflake-source-4">4</a></sup>

## Sources and notes

1. <span id="mosely-snowflake-source-1"></span> Calculation: for a starting cube one unit wide, the exposed surface area after $n$ steps is $\frac{30\cdot18^n+48\cdot5^n}{13\cdot9^n}$ with the center removed, and $\frac{12\cdot19^n+30\cdot5^n}{7\cdot9^n}$ with it kept. These formulas count exposed faces in this construction, including cavity walls, and exclude shared faces. Step zero is the original cube. Both expressions grow without bound. [Back](#mosely-snowflake-ref-1)
2. <span id="mosely-snowflake-source-2"></span> [Fractals and Self-Similarity](https://maths-people.anu.edu.au/~john/Assets/Research%20Papers/fractals_self-similarity.pdf). Background for the dimension rule: the small cubes have disjoint interiors, satisfying the theorem's separation condition. [Back](#mosely-snowflake-ref-2)
3. <span id="mosely-snowflake-source-3"></span> [The Impossible Snowflake](https://alt-fractals.blogspot.com/2011/04/impossible-snowflake.html) [Back](#mosely-snowflake-ref-3)
4. <span id="mosely-snowflake-source-4"></span> [The Mosely Snowflake Sponge: Construction Guide](https://www.theiff.org/exhibits/USC%20Sponge%20Guide.pdf) [Back](#mosely-snowflake-ref-4)
