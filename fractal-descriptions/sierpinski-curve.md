# Sierpinski Curve

This version of the Sierpinski curve is drawn on a square grid. Each turn is 90 degrees. New detours are inserted between the existing connecting lines at every step.

The starting instructions are `F+XF+F+XF`. F draws a forward step. X does not draw; it is replaced by a longer string of instructions:<sup><a id="sierpinski-curve-ref-1" href="#sierpinski-curve-source-1">1</a></sup>

```text
X → XF-F+F-XF+F+XF-F+F-X
```

<figure data-construction-player="sierpinski-curve"></figure>

There are eight F steps and four X symbols in that replacement. The starting string has four F steps and two X symbols. Replacing those two X symbols adds sixteen F steps, so the next drawing has twenty.

Those four X symbols in each replacement are expanded on the following round. Existing F instructions remain and join the new groups. This is why the total segment count does more than multiply by four.

The triangular [Sierpinski arrowhead](/l-system/sierpinski-arrowhead) shares the name but follows different replacement rules. Its turns are 60 degrees and its gaps are triangular.

## Sources and notes

1. <span id="sierpinski-curve-source-1"></span> Carlos A. Grande, [Compact reactor architectures designed with fractals — supporting information](https://www.rsc.org/suppdata/d1/re/d1re00107h/d1re00107h1.pdf), Reaction Chemistry & Engineering, 2021, table S1. Table S1 lists this replacement under “Square curve”, starting from `X+F+X`. [Back](#sierpinski-curve-ref-1)
