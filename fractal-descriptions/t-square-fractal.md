# T-Square Fractal

The T-Square Fractal starts from a single square. Then, on each iteration, four smaller squares are placed at the corners of every existing square. Repeating that simple rule builds up a pattern of overlapping squares that quickly becomes much more intricate than the starting shape suggests.

In this implementation, the most important parameter is the resize ratio between iterations. A ratio of `0.5` gives the classic version, but changing that value lets the pattern open up or crowd together in different ways.

Algorithmically, it is very direct:

```ts
drawSquare(center, size);

if (depth < iterations) {
  drawTSquare(topLeftCorner, size * ratio);
  drawTSquare(topRightCorner, size * ratio);
  drawTSquare(bottomLeftCorner, size * ratio);
  drawTSquare(bottomRightCorner, size * ratio);
}
```

Even though it is built from squares, the negative space between those squares can start to echo the triangular gaps that appear in the [Sierpinski Triangle](/l-system/sierpinski-triangle). It also belongs in the same recursive family as the [Sierpinski Carpet](/sierpinski-carpet), where a very small placement rule creates a much larger geometric structure.
