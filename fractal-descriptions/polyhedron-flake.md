# Polyhedron Flake

Start with an octahedron: two square pyramids joined at their bases, with eight triangular faces and six corners. Replace it with six half-size copies, one shrunk toward each corner and each facing the same way as the original, then do the same to every copy.<sup><a id="polyhedron-flake-ref-1" href="#polyhedron-flake-source-1">1</a></sup>

<figure data-construction-player="polyhedron-flake"></figure>

A half-size copy holds an eighth of the volume, so six copies hold 3/4 of the octahedron. The other 1/4 was eight small tetrahedra, pyramids with three sides, one behind the middle of each face. Each level keeps 3/4 of the level before, so the volume heads to zero.

With the volume disappearing, you would expect holes everywhere, so cut the flake flat through its middle and look at the cut.

<figure data-lesson="octahedron-cut"></figure>

The cut through a whole octahedron is a square standing on one corner. Four of the six copies sit around the middle and the cut goes through the middle of each, which leaves a half-size square at each corner of the big square, and four half-size squares fill it exactly. The top and bottom copies touch the cut at one point.

At the next level each of those four copies gets replaced the same way, so four smaller squares fill each half-size square, and this repeats at every level. So as you step through the levels, the volume keeps dropping and the cut stays 100% filled.

An octahedron looks the same standing on any of its six corners, so three of these squares cross at the center, and they never get a hole even as the volume heads to zero. Every copy has its own three as well.

Height 0 is the middle and height 1 is the top corner. Drag the height away from the middle and the cut crosses the empty tetrahedra, so holes appear, and raising the level makes the filled share keep falling. Two other stops on the slider stay solid: at 0.50 the cut goes through the middle of the top copy, and at 0.75 through the middle of that copy's top copy.

This page's other two solids, the dodecahedron and the icosahedron, don't do this. Their copies are smaller than half size, so they stop short of the center, and a cut through the middle has a hole after one replacement.

## Further exploring

- [Sierpinski tetrahedron](/sierpinski-tetrahedron), the same corner copies with four half-size tetrahedra
- [Three-dimensional flakes — Wikipedia](https://en.wikipedia.org/wiki/N-flake#In_three_dimensions)
- [Sierpinski Gasket — Paul Bourke](https://paulbourke.net/fractals/polyhedral/)

## Sources and notes

1. <span id="polyhedron-flake-source-1"></span> Background on repeated copies: [Fractals and Self-Similarity](https://maths-people.anu.edu.au/~john/Assets/Research%20Papers/fractals_self-similarity.pdf). [Back](#polyhedron-flake-ref-1)
