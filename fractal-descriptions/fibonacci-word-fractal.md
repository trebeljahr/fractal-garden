# Fibonacci Word Fractal

The Fibonacci Word Fractal comes from two closely related ideas: the [Fibonacci sequence](https://en.wikipedia.org/wiki/Fibonacci_number) and the [Fibonacci word](https://en.wikipedia.org/wiki/Fibonacci_word). The sequence is built by adding the two previous numbers to get the next one. The word version does something similar with strings, combining two earlier pieces over and over to build a longer pattern of `0`s and `1`s.

One common way to define the Fibonacci word is with the substitutions

```ts
0 -> 01
1 -> 0
```

starting from `0`.

To turn that word into a curve, we apply the odd-even drawing rule. For every symbol we draw one segment forward. Whenever the symbol is `0`, we also turn. On even positions we turn left, and on odd positions we turn right. Symbols `1` keep going straight.

That tiny rule is enough to produce a curve with a surprisingly rich structure. The familiar 90 degree version has a strong square rhythm, but it still feels softer than the [Hilbert Curve](/l-system/hilbert-curve) and less abrupt than the [Dragon Curve](/l-system/dragon-curve). It also shares something with the [Lévy Curve](/l-system/levy-curve): a long simple rule unfolds into a shape with many repeated details.

Because the full path changes orientation as it grows, this implementation traces the whole curve first, measures its bounds, and then scales it to fit the screen before drawing it.
