# Fibonacci Word Fractal

Start with `0`. Replace every `0` with `01` and every `1` with `0`. Apply the replacements to the entire old string before using the new one.

The strings begin `0`, `01`, `010`, `01001`, `01001010`. Their lengths are 1, 2, 3, 5 and 8: each length adds the two before it.<sup><a id="fibonacci-word-fractal-ref-1" href="#fibonacci-word-fractal-source-1">1</a></sup>

<figure data-construction-player="fibonacci-word-fractal"></figure>

Each digit draws a forward step. After a `1`, continue in the same direction. After a `0`, turn right if it is in an odd-numbered position and left if it is in an even-numbered position. Count positions from one. The default turn is 90 degrees.

A digit's position matters as much as its value. Moving a string forward by one position swaps all its odd and even positions, so every turn made by a zero reverses.

Each new Fibonacci string also equals the previous two strings joined in order. Their drawings cannot always be joined unchanged, though. If the first string has odd length, the second one's turns must reverse because its odd and even positions have swapped.

Changing the angle keeps the digit sequence and turn choices fixed, but changes the shape of the path.

## Further reading

- [Fibonacci word fractal — Wikipedia](https://en.wikipedia.org/wiki/Fibonacci_word_fractal)
- [Rabbit sequence background — MathWorld](https://mathworld.wolfram.com/RabbitSequence.html)
- [Properties and Generalizations of the Fibonacci Word Fractal — The Mathematica Journal](https://www.mathematica-journal.com/2014/02/19/properties-and-generalizations-of-the-fibonacci-word-fractal/)

## Sources and notes

1. <span id="fibonacci-word-fractal-source-1"></span> Alexis Monnerot-Dumaine, [The Fibonacci Word Fractal](https://mathcurve.com/fractals/fibonacci/The_Fibonacci_word_fractal.pdf), HAL manuscript hal-00367972, 2009, sections 1–4 and 6.1. Supplies the odd-even drawing rule, forbidden words and concatenation/reflection relationship. [Back](#fibonacci-word-fractal-ref-1)
