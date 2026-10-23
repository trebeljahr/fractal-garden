# Koch Surface

Join a triangle's edge midpoints, producing four half-size triangles. Keep the three corner triangles. Replace the middle triangle with the three exposed walls of an outward regular tetrahedron.<sup><a id="koch-surface-ref-1" href="#koch-surface-source-1">1</a></sup>

<figure data-investigation="koch-surface"></figure>

Every old triangle becomes six triangles with half its edge length and one-quarter its area. Starting from one triangle, round $n$ has $6^n$ faces and total face area

$$
A_n=A_0(6/4)^n=A_0(3/2)^n.
$$

The face area diverges while the construction stays bounded. The limiting single-face Koch surface has Hausdorff dimension

$$
D=\frac{\log6}{\log2}\approx2.585.
$$

Ferrer and Vélez-Santiago prove this dimension for their Koch 2-surface, the half-scale construction used here.<sup><a id="koch-surface-ref-2" href="#koch-surface-source-2">2</a></sup>

## Four rough faces can enclose a smooth cube

Choose the tetrahedron start to apply the rule to all four original faces. The added tetrahedra approach a cube whose alternate corners are the original tetrahedron's vertices. This is a special feature of the half-scale rule.

The distinction between the recursive surface and the enclosed solid matters here. The limiting solid is a cube, with an ordinary two-dimensional exterior. The recursive Koch surfaces also retain fractal structure inside that exterior. Their dimension remains $\log6/\log2$.<sup><a href="#koch-surface-source-2">2</a></sup> Adding every triangle's area therefore does not measure the cube's outer boundary area.

This separates two ways to extend the [Koch snowflake](/l-system/koch-snowflake) into space. This page raises tetrahedral bumps. The [Mosely snowflake](/mosely-snowflake) removes cube corners to obtain a Koch **shadow**. The [Sierpinski tetrahedron](/sierpinski-tetrahedron) keeps four half-size corner tetrahedra and removes the central octahedron.

## Sources and notes

1. <span id="koch-surface-source-1"></span> Neel Shrestha, [Creating Square Koch Surfaces Using Origami](https://archive.bridgesmathart.org/2024/bridges2024-567.pdf), Bridges 2024, pp. 567–572. Triangle and square surface generators. [Back](#koch-surface-ref-1)
2. <span id="koch-surface-source-2"></span> Giovanni Ferrer and Alejandro Vélez-Santiago, [3D Koch-type crystals](https://ems.press/content/serial-article-files/37384), Journal of Fractal Geometry 10 (2023), 109–149, Example 3 and §3. Dimension of the Koch 2-surface and the exceptional cube limit. The area formula counts generated faces. [Back](#koch-surface-ref-2)
