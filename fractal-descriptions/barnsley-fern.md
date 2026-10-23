# Barnsley Fern

One fern can come from two different algorithms. The **chaos game** moves one point through randomly chosen maps and keeps its trail. **Deterministic iteration** applies every map to an entire set, then replaces that set with the union of its images.

## Four affine maps

For **Classic Barnsley**, the maps act on coordinates $(x,y)$ as follows:

$$
f_1(x,y)=(0,0.16y)
$$
$$
f_2(x,y)=(0.85x+0.04y,-0.04x+0.85y+1.6)
$$
$$
f_3(x,y)=(0.20x-0.26y,0.23x+0.22y+1.6)
$$
$$
f_4(x,y)=(-0.15x+0.28y,0.26x+0.24y+0.44).
$$

Their selection probabilities are 1%, 85%, 7% and 7%. The first map collapses the whole fern onto its stem. The second shrinks and turns it toward the tip. The other maps place copies in the side leaflets. These coefficients and probabilities come directly from this explorer's Classic Barnsley preset.

<figure data-article-images="fern"></figure>

## One point or a whole set

In the chaos game, start at $p_0=(0,0)$ and choose a map at each step. Set $p_{n+1}=f_i(p_n)$ and plot the result. The picture accumulates earlier dots, although the next move uses only the latest point. For these contracting maps, independent choices with fixed positive probabilities recover the attractor almost surely in the limit.<sup><a id="barnsley-fern-ref-1" href="#barnsley-fern-source-1">1</a></sup>

For deterministic iteration, begin with the set $S_0=\{(0,0)\}$. Replace it at every step:

$$
S_{n+1}=f_1(S_n)\cup f_2(S_n)\cup f_3(S_n)\cup f_4(S_n).
$$

After $n$ steps, there are $4^n$ map addresses before coincident points merge. That count is calculated from this implementation's four choices per step. It counts addresses, not distinct dots. For example, $f_2(0,0)=f_3(0,0)=(0,1.6)$, so the first generation has only three distinct positions. The lesson's **All four maps** button switches from the orbit replay to this set construction.

<figure data-lesson="fern"></figure>

Both methods approach the same compact set $F$, which satisfies

$$
F=f_1(F)\cup f_2(F)\cup f_3(F)\cup f_4(F).
$$

Hutchinson proved uniqueness and convergence for a finite family of contractions. Deterministic iteration approaches $F$ from any nonempty compact seed, including a point, rectangle or drawing.<sup><a id="barnsley-fern-ref-2" href="#barnsley-fern-source-2">2</a></sup> Finite generations still depend on the seed. Changing positive probabilities changes the invariant dot density, while the fixed maps determine the limiting set.<sup><a id="barnsley-fern-ref-3" href="#barnsley-fern-source-3">3</a></sup>

## Reconstructing inside the zoom

Open **Fractal Studio Controls → Construction method** to choose **Chaos game** or **All four maps**. Scroll or pinch over a leaflet to reveal smaller copies. Drag to pan. Each changed viewport starts fresh refinement, even when continuous sampling is paused. Double-click the drawing to return to the full fern.

The zoom renderer composes the same maps into smaller copies and discards copies whose enclosing bounds miss the viewport. Chaos mode samples fresh orbit points inside the surviving copies. All four maps mode subdivides to small screen-sized copies, then plots a representative point. Dense views use a coarser tolerance to bound work across the entire viewport. These are adaptive renderings of the limiting set, rather than one fixed finite generation.

Sampling visible copies gives sparse regions more dots than an unmodified full-fern orbit would provide. The zoomed picture therefore shows geometry, not a faithful measurement of the original probability density. Camera positions and large map compositions retain extra precision as the viewport shrinks. The renderer converts small visible copies to screen coordinates before plotting.

## Different fern shapes

**Fern style** changes the maps themselves. A general affine rule has the form

$$
\begin{pmatrix}x'\\y'\end{pmatrix}
=
\begin{pmatrix}a&b\\c&d\end{pmatrix}
\begin{pmatrix}x\\y\end{pmatrix}
+
\begin{pmatrix}e\\f\end{pmatrix}.
$$

The matrix controls stretching, turning, shearing and reflection. The translation $(e,f)$ places the copy. Compare **Cyclosorus** and **Fishbone fern**: their main-copy coefficients change from $b=0.005,c=-0.005$ to $b=0.002,c=-0.002$. Their side-copy matrices also change. Both presets keep probabilities 2%, 84%, 7% and 7%. These comparisons describe this explorer's presets, rather than botanical growth models.

To construct branches from symbols, follow the [L-system fern](/l-system/fern-1). Its turtle reads instructions for forward movement, turns, and saved branch positions. That produces a different mathematical fern. The [fractal canopy](/fractal-canopy) instead repeats explicit branch geometry.

## Sources and notes

1. <span id="barnsley-fern-source-1"></span> Michael F. Barnsley and Andrew Vince, [The Chaos Game on a General Iterated Function System](https://arxiv.org/pdf/1005.0322), *Ergodic Theory and Dynamical Systems* 31, no. 4 (2011), 1073–1079. Theorem 3 establishes almost-sure convergence under conditions that include these contracting maps and fixed positive selection probabilities. [Back](#barnsley-fern-ref-1)
2. <span id="barnsley-fern-source-2"></span> John E. Hutchinson, [Fractals and Self Similarity](https://maths-people.anu.edu.au/~john/Assets/Research%20Papers/fractals_self-similarity.pdf), *Indiana University Mathematics Journal* 30 (1981), 713–747. Sections 3.1–3.2 prove uniqueness of the compact invariant set and convergence of whole-set iteration. [Back](#barnsley-fern-ref-2)
3. <span id="barnsley-fern-source-3"></span> Hutchinson, same paper, Section 4.4. Fixed positive weights give a unique invariant probability measure whose support is the invariant set. The coefficients, finite address counts, preset comparisons and viewport sampling strategy above are properties of this implementation. [Back](#barnsley-fern-ref-3)
