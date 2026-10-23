# Fibonacci Word Fractal

A string of zeros and ones can tell a pen where to go.

Start with `0`. Replace every `0` with `01` and every `1` with `0`. The first strings are:

```text
0
01
010
01001
01001010
```

Their lengths are 1, 2, 3, 5 and 8. Each length is the sum of the two before it.<sup><a id="fibonacci-word-fractal-ref-1" href="#fibonacci-word-fractal-source-1">1</a></sup>

<figure data-construction-player="fibonacci-word-fractal"></figure>

Every digit draws one step. After a `1`, keep going straight. After a `0`, turn right at odd positions and left at even positions. Count positions from one. The usual turn is 90 degrees.

You can make each new string by joining the previous two. But joining their drawings takes care. If the first string has odd length, the second string starts on the opposite odd-or-even count. Its left and right turns swap.

At 90 degrees, related shapes three rounds apart grow by a factor of $1+\sqrt2$, about 2.414.<sup><a id="fibonacci-word-fractal-ref-2" href="#fibonacci-word-fractal-source-2">2</a></sup> The line counts follow Fibonacci numbers, while the picture uses a different growth factor.

Try changing the angle. The digits stay the same, but the route changes. The [Rauzy fractal](/rauzy-fractal) turns a string into a picture another way, using steps in three directions.

## Sources and notes

1. <span id="fibonacci-word-fractal-source-1"></span> Alexis Monnerot-Dumaine, [The Fibonacci Word Fractal](https://mathcurve.com/fractals/fibonacci/The_Fibonacci_word_fractal.pdf), HAL manuscript hal-00367972, 2009, sections 1–4 and 6.1. Supplies the odd-even drawing rule, forbidden words and concatenation/reflection relationship. Our seed 0 shifts the manuscript’s word numbering. [Back](#fibonacci-word-fractal-ref-1)
2. <span id="fibonacci-word-fractal-source-2"></span> Monnerot-Dumaine, [The Fibonacci Word Fractal, sections 4–5](https://mathcurve.com/fractals/fibonacci/The_Fibonacci_word_fractal.pdf), 2009. Supports the three-generation scale at 90 degrees. No dimension formula is asserted here for arbitrary slider angles. [Back](#fibonacci-word-fractal-ref-2)
