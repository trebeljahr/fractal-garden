# Penrose Tiling

A Penrose tiling repeats finite patches without repeating under any translation of the whole plane. Two tile shapes suffice, provided neighboring tiles obey matching rules. Shape alone does not prevent periodic arrangements.<sup><a id="penrose-tiling-ref-1" href="#penrose-tiling-source-1">1</a></sup>

The explorer shows **P2 kite and dart** and **P3 thick and thin rhombi**. Their subdivisions use the golden ratio $\varphi=(1+\sqrt5)/2$.

## Subdivide without repeating

The P2 diagram uses triangular halves. An acute half-kite has angles $36°,72°,72°$. An obtuse half-dart has angles $108°,36°,36°$. An acute half becomes two acute halves and one obtuse half. An obtuse half becomes one of each.

<figure data-lesson="penrose"></figure>

A cut divides an edge in the ratio $\varphi:1$. This **deflation** keeps the patch boundary fixed while its tiles shrink. The main explorer instead shows fixed tiles at different magnifications. Sun and star seeds choose different compatible patches.

If $a_n$ and $b_n$ count the two triangular halves, the displayed rule gives

$$
a_{n+1}=2a_n+b_n,\qquad b_{n+1}=a_n+b_n.
$$

The substitution matrix has eigenvalues $\varphi^2$ and $\varphi^{-2}$. Hence the acute-to-obtuse count ratio approaches $\varphi$, while the total count grows asymptotically by $\varphi^2$ per round. Fibonacci numbers appear in its matrix powers.<sup><a href="#penrose-tiling-source-1">1</a></sup>

## A shadow selected from five dimensions

De Bruijn gives another construction for the rhombus tilings.<sup><a id="penrose-tiling-ref-2" href="#penrose-tiling-source-2">2</a></sup> Start with the integer lattice in five dimensions. Keep lattice points whose coordinates in the complementary space fall inside a bounded window. Project those selected points onto a plane. The selection produces a discrete tiling with five edge directions.

Projecting every lattice point without that window would not produce the Penrose tiling. This explorer uses subdivision, rather than displaying that higher-dimensional construction.

The tiling fills the plane, so its dimension is $2$. Its connection to fractals is the recurring organization across scales. The [Fibonacci word fractal](/l-system/fibonacci-word-fractal) uses another golden-ratio substitution. The [Rauzy fractal](/rauzy-fractal) also relates a planar shape to a higher-dimensional projection.

## Sources and notes

1. <span id="penrose-tiling-source-1"></span> Tilings Encyclopedia, Bielefeld University, [Penrose Rhomb](https://tilings.math.uni-bielefeld.de/substitution/penrose-rhomb/), Matching rules, substitution, golden-ratio inflation and Fibonacci matrix entries. The recurrence above is calculated from this page’s P2 half-tile rule. [Back](#penrose-tiling-ref-1)
2. <span id="penrose-tiling-source-2"></span> N. G. de Bruijn, [Algebraic theory of Penrose’s non-periodic tilings of the plane, I, II](https://research.tue.nl/en/publications/algebraic-theory-of-penroses-non-periodic-tilings-of-the-plane-i-/), Indagationes Mathematicae 43 (1981), 39–66. Original pentagrid and lattice-projection framework; the linked university record supplies the published paper. The Tilings Encyclopedia also describes the five-dimensional lattice and three-dimensional internal space. [Back](#penrose-tiling-ref-2)
