# Penrose Tiling

Look for a patch of tiles. You can find that patch again elsewhere. But slide the whole pattern in any direction, and it never lines up with itself perfectly.

A Penrose tiling repeats local shapes without repeating the whole layout. Two tile shapes are enough, as long as their edges obey the matching rules.<sup><a id="penrose-tiling-ref-1" href="#penrose-tiling-source-1">1</a></sup>

The explorer offers **kite and dart** tiles or **thick and thin rhombi**.

## Smaller tiles inside each tile

The diagram splits kites and darts into triangular halves. A narrow triangle becomes two narrow triangles and one wide triangle. A wide triangle becomes one of each.

<figure data-lesson="penrose"></figure>

The cuts use the golden ratio, about 1.618. Each round leaves the outside of the patch fixed and puts smaller tiles inside it.

The main explorer shows fixed tiles at different magnifications. The **sun** and **star** starts choose different patches that follow the same rules.

## Another way to make it

De Bruijn found a construction using a grid in five dimensions. Select a particular band of grid points, then project them onto a plane. Those selected points give a Penrose pattern.<sup><a id="penrose-tiling-ref-2" href="#penrose-tiling-source-2">2</a></sup>

The selection matters. Projecting every grid point would not give this tiling. The explorer uses subdivision instead.

The tiles fill the plane. Their connection to fractals is how smaller and larger arrangements repeat. The [Fibonacci word fractal](/l-system/fibonacci-word-fractal) also grows from a replacement rule linked to the golden ratio.

## Sources and notes

1. <span id="penrose-tiling-source-1"></span> Tilings Encyclopedia, Bielefeld University, [Penrose Rhomb](https://tilings.math.uni-bielefeld.de/substitution/penrose-rhomb/), Matching rules, substitution, golden-ratio inflation and Fibonacci matrix entries. The triangle counts follow this page’s P2 half-tile rule. [Back](#penrose-tiling-ref-1)
2. <span id="penrose-tiling-source-2"></span> N. G. de Bruijn, [Algebraic theory of Penrose’s non-periodic tilings of the plane, I, II](https://research.tue.nl/en/publications/algebraic-theory-of-penroses-non-periodic-tilings-of-the-plane-i-/), Indagationes Mathematicae 43 (1981), 39–66. Original pentagrid and lattice-projection framework; the linked university record supplies the published paper. The Tilings Encyclopedia also describes the five-dimensional lattice and three-dimensional internal space. [Back](#penrose-tiling-ref-2)
