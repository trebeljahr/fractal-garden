# Fern 3

Every stroke grows the same nine-stroke plant in this local preset. Start with F, use 22.5-degree turns, and replace:

```
F → F[+FF][-FF]F[-F][+F]F
```

Three unbracketed F strokes form the continuing stem. The first branch pair contains two strokes per branch. The second contains one per branch. Closing each bracket restores the saved position and direction without drawing a return line.<sup><a id="fern-3-ref-1" href="#fern-3-source-1">1</a></sup>

<figure data-construction-player="fern-3"></figure>

At the next rewrite, all nine F symbols receive the entire replacement. A two-stroke branch therefore grows two consecutive copies, while a one-stroke branch grows one. The unequal branch lengths recur throughout the image without separate symbols for long and short branches.

After $n$ rewrites, the word contains $9^n$ forward strokes. The unbracketed route spans $3^n$ unit strokes, so dividing lengths by three per rewrite preserves that stem's height. The total travelled length then triples at each stage.

These are counts of drawing instructions. Branches can overlap in the image, so the counts alone do not determine a geometric dimension. [Fern 2](/l-system/fern-2) distributes growth between two non-drawing symbols instead.

## Sources and notes

1. <span id="fern-3-source-1"></span> Przemysław Prusinkiewicz and Aristid Lindenmayer, [The Algorithmic Beauty of Plants, chapter 1](https://algorithmicbotany.org/papers/abop/abop-ch1.lowquality.pdf), Springer-Verlag, 1990. Section 1.6 supplies the branching interpretation. The nine-stroke count and three-stroke stem are direct derivations from the preset. [Back](#fern-3-ref-1)
