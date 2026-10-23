# Quadratic Koch Surface

Divide a square into nine equal squares. Replace the middle square with the five exposed faces of an outward cube. Eight flat squares and five bump faces replace the original face.<sup><a id="quadratic-koch-3d-ref-1" href="#quadratic-koch-3d-source-1">1</a></sup> This explorer starts from all six faces of a cube.

<figure data-investigation="quadratic-koch-3d"></figure>

Each replacement produces thirteen squares with one-third the edge length. After $n$ rounds, the mesh has

$$
F_n=6\cdot13^n
$$

faces. For a unit starting cube, summing those faces gives

$$
A_n=6(13/9)^n.
$$

Every square shrinks, yet the total generated face area grows without bound. The generator's similarity dimension is

$$
D=\frac{\log13}{\log3}\approx2.335.
$$

This value describes the scaling rule for the limiting surface. Each finite displayed mesh consists of ordinary flat squares, whose individual dimension is $2$.

## Bounded reach, unbounded detail

A stack of successive outward bumps adds heights

$$
\frac13+\frac19+\frac1{27}+\cdots=\frac12
$$

relative to the starting cube's side. The construction therefore fits within a cube twice as wide as its seed.

Neel Shrestha gives an origami construction of this same thirteen-square generator. His second-stage model uses separate folding modules for the square surface and neighboring faces.<sup><a href="#quadratic-koch-3d-source-1">1</a></sup> A finite version can therefore be assembled without a computer.

The [Koch surface](/koch-surface) replaces each triangle with six half-size triangles. The [quadratic snowflake](/l-system/quadratic-snowflake) replaces line segments with square bumps. The [Menger sponge](/menger-sponge) removes cubes, whereas this construction adds bumps to faces.

## Sources and notes

1. <span id="quadratic-koch-3d-source-1"></span> Neel Shrestha, [Creating Square Koch Surfaces Using Origami](https://archive.bridgesmathart.org/2024/bridges2024-567.pdf), Bridges 2024, pp. 567–572. Original folding method and thirteen-square generator. Counts, area, reach and similarity dimension above are calculations from that generator. [Back](#quadratic-koch-3d-ref-1)
