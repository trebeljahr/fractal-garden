# Fibonacci Word Fractal

Start with `0` and rewrite `0 → 01`, `1 → 0`. The first words are `0`, `01`, `010`, `01001`, and `01001010`. Each word joins the previous two, in that order. Their lengths are 1, 2, 3, 5 and 8.<sup><a id="fibonacci-word-fractal-ref-1" href="#fibonacci-word-fractal-source-1">1</a></sup>

Every digit draws one unit step. After a zero, turn right at odd positions and left at even positions, counting from one. After a one, keep the same heading. The usual turn is 90 degrees. This page also lets you change it.

<figure data-construction-player="fibonacci-word-fractal"></figure>

Parity explains why joining two words is not always the same as joining two unchanged drawings. If the first word has odd length, every position in the appended word changes parity. Its left and right turns swap. If the first word has even length, the turn choices remain unchanged.

The word contains neither `11` nor `000`. Thus, two consecutive straight-through digits never occur, and at most two zero-triggered turns occur consecutively. These restrictions come from the substitution, without any reference to the drawing angle.

At 90 degrees, Monnerot-Dumaine identifies a geometric scale of $1+\sqrt{2}$ between related stages three rewrites apart.<sup><a id="fibonacci-word-fractal-ref-2" href="#fibonacci-word-fractal-source-2">2</a></sup> The word grows through the golden ratio, while the geometric scale uses the silver ratio. The [Rauzy fractal](/rauzy-fractal) gives another way to turn a substitution into a planar set.

## Sources and notes

1. <span id="fibonacci-word-fractal-source-1"></span> Alexis Monnerot-Dumaine, [The Fibonacci Word Fractal](https://mathcurve.com/fractals/fibonacci/The_Fibonacci_word_fractal.pdf), HAL manuscript hal-00367972, 2009, sections 1–4 and 6.1. Supplies the odd-even drawing rule, forbidden words and concatenation/reflection relationship. Our seed 0 shifts the manuscript’s word numbering. [Back](#fibonacci-word-fractal-ref-1)
2. <span id="fibonacci-word-fractal-source-2"></span> Monnerot-Dumaine, [The Fibonacci Word Fractal, sections 4–5](https://mathcurve.com/fractals/fibonacci/The_Fibonacci_word_fractal.pdf), 2009. Supports the three-generation scale at 90 degrees. No dimension formula is asserted here for arbitrary slider angles. [Back](#fibonacci-word-fractal-ref-2)
