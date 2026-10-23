# Sierpinski Curve

Follow one path as it winds around smaller and smaller square gaps. Every turn is a right angle. Each round adds new detours while keeping the old connecting lines.

<figure data-construction-player="sierpinski-curve"></figure>

The first drawing has four steps. The next rounds have 20, 84 and 340. The route grows quickly because each X adds eight drawing steps and four new X symbols.

## The drawing instructions

Start with `F+XF+F+XF` and use:

```text
X → XF-F+F-XF+F+XF-F+F-X
```

F draws forward. X adds instructions for the next round without drawing. Plus and minus turn by 90 degrees.<sup><a id="sierpinski-curve-ref-1" href="#sierpinski-curve-source-1">1</a></sup>

The X symbols make the smaller detours. The F steps already in the string remain and connect the new groups.

Researchers also use paths like this to lay out proposed reactor channels. A 2021 study lists this exact replacement rule, with a different starting string.<sup><a id="sierpinski-curve-ref-2" href="#sierpinski-curve-source-2">2</a></sup> It gives a way to fit a connected route into a compact space.

The [Hilbert curve](/l-system/hilbert-curve) offers another route through nested squares. The [Sierpinski arrowhead](/l-system/sierpinski-arrowhead) leaves triangular gaps instead.

## Sources and notes

1. <span id="sierpinski-curve-source-1"></span> Carlos A. Grande, [Compact reactor architectures designed with fractals — supporting information](https://www.rsc.org/suppdata/d1/re/d1re00107h/d1re00107h1.pdf), Reaction Chemistry & Engineering, 2021, table S1. Lists the same Square curve production, with axiom X+F+X. The counts above use this garden’s four-F, two-X seed. [Back](#sierpinski-curve-ref-1)
2. <span id="sierpinski-curve-source-2"></span> Carlos A. Grande, [Compact reactor architectures designed with fractals](https://pubs.rsc.org/en/content/articlelanding/2021/re/d1re00107h), Reaction Chemistry & Engineering, 2021, DOI 10.1039/D1RE00107H. The article studies compact reactor channel architectures based on fractal paths; the supporting information supplies the L-system table. [Back](#sierpinski-curve-ref-2)
