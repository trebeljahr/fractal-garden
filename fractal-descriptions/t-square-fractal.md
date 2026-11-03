# T-Square Fractal

Start with a square. Place a half-size square with its center on each corner. Keep the original square, then repeat on the four new ones.

The next step adds sixteen squares. The step after that adds sixty-four. Smaller squares extend the outline and overlap parts of earlier squares.

<figure data-lesson="t-square-cover"></figure>

The whole drawing stays inside a box twice as wide as the first square. That box is the frame in the picture.

Four half-size squares have the same combined area as their parent, so each round adds the first square's area again. Adding up the areas of all the squares gives the whole box by round 3 and more than twice the box by round 8. But the squares overlap, and that sum counts each overlap again. Press **Outlines** to see every square, including the ones hidden inside earlier squares.

To find what the squares really cover, go back to **Filled** and look at the dark part. The thin lines divide it into small squares, each half as wide as the newest squares in the drawing. Each small dark square has exactly one corner where the next round centers a new square. That new square is as wide as the small dark square, so it covers exactly one quarter of it. The amber shows those quarters.

So each round covers a quarter of what is still uncovered. The first square leaves 3/4 of the box uncovered, and after round $n$ the uncovered share is $(3/4)^{n+1}$. By round 8 the squares cover 92.5% of the box, and the uncovered share heads to zero.

Some points are never covered, such as the corners of the box. Together those points have no area.

## Further exploring

- [T-square fractal — Wikipedia](https://en.wikipedia.org/wiki/T-square_(fractal))
- [A227621: T-square perimeters — OEIS](https://oeis.org/A227621)
