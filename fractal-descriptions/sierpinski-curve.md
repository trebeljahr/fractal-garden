# Sierpinski Curve

This page draws the square-grid form of the Sierpinski curve. Start with `F+XF+F+XF`, use 90-degree turns, and replace:

```
X → XF-F+F-XF+F+XF-F+F-X
```

F draws forward and stays unchanged during rewriting. X draws nothing. Each X inserts eight F strokes and four new X symbols. The route's smaller detours occupy a square lattice, unlike the triangular gaps of the [Sierpinski arrowhead](/l-system/sierpinski-arrowhead).<sup><a id="sierpinski-curve-ref-1" href="#sierpinski-curve-source-1">1</a></sup>

<figure data-construction-player="sierpinski-curve"></figure>

Starting from four F and two X symbols gives 4, 20, 84 and 340 strokes. The continuing F strokes connect the new groups. This is why replacing each X with four copies does not merely quadruple the entire stroke count.

The exact count after $n$ rewrites is $(16\cdot4^n-4)/3$. It follows by adding eight strokes for every old X.

There is a physical use for these routing languages. Grande's study of compact reactor architectures lists this exact production as a “Square curve,” using a different initial word. The work turns space-filling paths into proposed reactor channels.<sup><a id="sierpinski-curve-ref-2" href="#sierpinski-curve-source-2">2</a></sup> Compare the [Hilbert curve](/l-system/hilbert-curve) for another way to organise a connected route inside nested squares.

## Sources and notes

1. <span id="sierpinski-curve-source-1"></span> Carlos A. Grande, [Compact reactor architectures designed with fractals — supporting information](https://www.rsc.org/suppdata/d1/re/d1re00107h/d1re00107h1.pdf), Reaction Chemistry & Engineering, 2021, table S1. Lists the same Square curve production, with axiom X+F+X. The counts above use this garden’s four-F, two-X seed. [Back](#sierpinski-curve-ref-1)
2. <span id="sierpinski-curve-source-2"></span> Carlos A. Grande, [Compact reactor architectures designed with fractals](https://pubs.rsc.org/en/content/articlelanding/2021/re/d1re00107h), Reaction Chemistry & Engineering, 2021, DOI 10.1039/D1RE00107H. The article studies compact reactor channel architectures based on fractal paths; the supporting information supplies the L-system table. [Back](#sierpinski-curve-ref-2)
