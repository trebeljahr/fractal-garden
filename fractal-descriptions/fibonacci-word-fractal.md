# Fibonacci Word Fractal

Start with `0`, then replace every `0` with `01` and every `1` with `0`, applying the replacements to the entire old string before using the new one.

The strings begin `0`, `01`, `010`, `01001`, `01001010`. Their lengths are 1, 2, 3, 5 and 8: each length adds the two before it.<sup><a id="fibonacci-word-fractal-ref-1" href="#fibonacci-word-fractal-source-1">1</a></sup> The figure calls `01` level 1, `010` level 2, and so on.

To draw a string, each digit draws a line forward. After a `1`, continue in the same direction. After a `0`, turn right if it is in an odd-numbered position and left if it is in an even-numbered position, counting positions from one. The default turn is 90 degrees.

<figure data-construction-player="fibonacci-word-fractal"></figure>

Each string is the previous two joined: `01001` is `010` followed by `01`. Joining moves every digit of the second string along by the first one's length, so if that length is odd, odd positions become even and even positions become odd. All the second string's turns then reverse, and it draws as a mirror image. If the length is even, it keeps its turns.<sup><a id="fibonacci-word-fractal-ref-2" href="#fibonacci-word-fractal-source-1">1</a></sup>

The first string always starts with the second one, so you can compare them on screen by choosing **Two strings**. At level 6, the blue part is the start of the gold part flipped over, and at level 5 it is the start of the gold part turned.

The lengths run odd, even, odd, odd, even, odd, odd, even. An even length needs two odd lengths before it, so it comes only every third level, and the picture repeats every three levels too. Compare levels 6, 9 and 12: each is the one before turned a quarter turn, with finer detail.<sup><a id="fibonacci-word-fractal-ref-3" href="#fibonacci-word-fractal-source-1">1</a></sup>

Line counts are Fibonacci numbers, which grow by about 1.618 each level, a number called the golden ratio. Over three levels the lines multiply by $1.618^3 = 4.236$.<sup><a id="fibonacci-word-fractal-ref-4" href="#fibonacci-word-fractal-source-1">1</a></sup> The picture grows more slowly: the distance from the path's start to its end grows only about 2.414 times.

Choose **Five pieces** to see why. The dashed line shows that distance. From level 5 on, the path divides into five pieces, some of them mirror images: two copies of the curve from three levels back, one copy from six levels back, and two more from three levels back. At level 12 they have 89, 89, 21, 89 and 89 lines, and all five add lines: $377 = 4 \times 89 + 21$.<sup><a id="fibonacci-word-fractal-ref-5" href="#fibonacci-word-fractal-source-1">1</a></sup>

Only three add distance. At level 12 the first piece goes down, the next three go across, and the last comes back up, so down and up cancel. The three across add up to $17 + 7 + 17$, which puts the end $41 = 2 \times 17 + 7$ line lengths from the start.<sup><a id="fibonacci-word-fractal-ref-6" href="#fibonacci-word-fractal-source-2">2</a></sup> Levels 6, 9, 15 and 18 work the same way.

That sum sets the growth. If each distance is $r$ times the one three levels before, dividing $41 = 2 \times 17 + 7$ by 17 gives $r = 2 + 1/r$. The only positive number that fits is $1 + \sqrt{2} = 2.414\ldots$, called the silver ratio.<sup><a id="fibonacci-word-fractal-ref-7" href="#fibonacci-word-fractal-source-1">1</a></sup>

## Further exploring

- [Fibonacci word fractal — Wikipedia](https://en.wikipedia.org/wiki/Fibonacci_word_fractal)
- [Properties and Generalizations of the Fibonacci Word Fractal — The Mathematica Journal](https://www.mathematica-journal.com/2014/02/19/properties-and-generalizations-of-the-fibonacci-word-fractal/)

## Sources and notes

1. <span id="fibonacci-word-fractal-source-1"></span> [The Fibonacci Word Fractal](https://mathcurve.com/fractals/fibonacci/The_Fibonacci_word_fractal.pdf). [Back](#fibonacci-word-fractal-ref-1) [Back](#fibonacci-word-fractal-ref-2) [Back](#fibonacci-word-fractal-ref-3) [Back](#fibonacci-word-fractal-ref-4) [Back](#fibonacci-word-fractal-ref-5) [Back](#fibonacci-word-fractal-ref-7)
2. <span id="fibonacci-word-fractal-source-2"></span> Calculation. Checked in whole line lengths on this page's path for levels 6, 9, 12, 15 and 18. The last two pieces each end on a line that differs from a true copy, and those two differences cancel. At the levels between, the dashed line runs at a slant and the sum is not exact, though the growth is the same. [Back](#fibonacci-word-fractal-ref-6)
