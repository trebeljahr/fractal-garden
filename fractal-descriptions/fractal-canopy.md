# Fractal Canopy

Draw a trunk. At its tip, start $b$ shorter branches whose headings differ by a fixed angle. Repeat at every tip. This explorer's **Classic canopy** uses three children per branch, a length ratio of $0.6$, and 43 degrees between neighboring headings.

The diagram below isolates a two-child fork. It shows how changing the angle changes the outline while preserving the branching rule.

<figure data-construction="canopy"></figure>

A generation numbered $n$ contains $b^n$ branch instances. Each has length $L_0r^n$, so their combined length, counting overlaps, is

$$
\ell_n=L_0(br)^n.
$$

Along any one path, however, the total length is at most $L_0/(1-r)$ when $0\le r<1$. Thus a tree can remain bounded while its total counted branch length diverges. The Classic canopy has $br=1.8$, so each generation adds 80 percent more counted length than the previous one.

The length ratio controls geometry. **Width factor** controls stroke thickness separately. Thick strokes can hide gaps between branches, and overlapping branch instances need not add new visible length. A single copy-count formula cannot assign a Hausdorff dimension to every angle and overlap setting.

## Fractal trees in a water tank

Researchers at Johns Hopkins use physical fractal trees to study canopy flow.<sup><a id="fractal-canopy-ref-1" href="#fractal-canopy-source-1">1</a></sup> Their model has five generations and three branches at each fork. Some acrylic models match the liquid's refractive index, allowing cameras to measure flow between branches that would otherwise obstruct the view.

That experiment uses a particular three-dimensional model, rather than this drawing's presets. It studies how several geometric scales interact with moving fluid. The [Pythagoras tree](/pythagoras-tree) supplies another branching rule, with square areas fixed by a right triangle.

## Sources and notes

1. <span id="fractal-canopy-source-1"></span> Kunlun Bai, Charles Meneveau, Joseph Katz and the Laboratory for Experimental Fluid Dynamics, [Fractal Canopy](https://engineering.jhu.edu/lefd/canopy-flows/fractal-canopy/), Johns Hopkins University. Physical tree model, five generations and refractive-index-matched flow measurements. Branch counts and length formulas above derive from this explorer’s recursive rule. [Back](#fractal-canopy-ref-1)
