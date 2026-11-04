# Polyhedron Flake

Start with an octahedron: two square pyramids joined at their bases, with eight triangular faces and six corners. Replace it with six half-size copies, one shrunk toward each corner. Each copy keeps the original orientation. Then do the same to every copy.<sup><a id="polyhedron-flake-ref-1" href="#polyhedron-flake-source-1">1</a></sup>

<figure data-construction-player="polyhedron-flake"></figure>

A half-size copy holds an eighth of the volume, so six copies hold 3/4 of the octahedron. The other 1/4 was eight small tetrahedra, pyramids with three sides, one behind the middle of each face. Those are now empty. Each level keeps 3/4 of the level before, so the volume heads to zero.

Now cut the flake flat through its middle, and look at the cut.

<figure data-lesson="octahedron-cut"></figure>

The cut through a whole octahedron is a square standing on one corner. Four of the six copies sit around the middle, and the cut goes through the middle of each. That leaves a half-size square at each corner of the big square, and four half-size squares fill it exactly. The top and bottom copies touch the cut at one point.

At the next level, each of those four copies gets replaced the same way, so four smaller squares fill each half-size square. This repeats at every level. Step through the levels: the volume keeps dropping, and the cut stays 100% filled.

You can stand an octahedron on any of its six corners and it looks the same, so three of these squares cross at the center. The volume heads to zero, yet these three squares never get a hole. Every copy has its own three as well.

Now drag the height. Height 0 is the middle, and height 1 is the top corner. Away from the middle, the cut crosses the empty tetrahedra and holes appear. Raise the level, and the filled share keeps falling.

Two other stops on the slider stay solid. At 0.50 the cut goes through the middle of the top copy, and at 0.75 through the middle of that copy's top copy.

This page's other two solids, the dodecahedron and the icosahedron, don't do this. Their copies are smaller than half size, so they stop short of the center, and a cut through the middle has a hole from level 1.

## Further exploring

- [Sierpinski tetrahedron](/sierpinski-tetrahedron), the same corner copies with four half-size tetrahedra
- [Three-dimensional flakes — Wikipedia](https://en.wikipedia.org/wiki/N-flake#In_three_dimensions)
- [Sierpinski Gasket — Paul Bourke](https://paulbourke.net/fractals/polyhedral/)

## Sources and notes

1. <span id="polyhedron-flake-source-1"></span> Background on repeated copies: [Fractals and Self-Similarity](https://maths-people.anu.edu.au/~john/Assets/Research%20Papers/fractals_self-similarity.pdf). [Back](#polyhedron-flake-ref-1)
