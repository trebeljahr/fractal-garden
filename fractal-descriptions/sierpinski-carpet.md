# Sierpinski Carpet

The Sierpinski Carpet is a fractal that is very simple to generate. Start with a square, divide it into 9 squares, and cut out the middle square. Then repeat that step for the 8 squares left... And so on.

This is what this idea looks like in code:

```ts
function SierpinskiCarpet(
  len: number,
  coordinates: { x: number; y: number },
  iterations: number
) {
  // stop if maximum depth is reached
  if (iterations >= config.maxIterations) return;

  fill(config.color);
  rect(coordinates.x, coordinates.y, len, len);

  // subdivide into 9 squares
  for (let x = 0; x <= 2; x++) {
    for (let y = 0; y <= 2; y++) {

      // calculate new corner of square
      const newCoordinates = {
        x: coordinates.x + x * (len / 3),
        y: coordinates.y + y * (len / 3),
      };
      if (x === 1 && y === 1) {
        // cut out the middle square by using different color
        fill(config.fillColor);
        rect(newCoordinates.x, newCoordinates.y, len / 3, len / 3);
      } else {
        // for the other 8 -> recurse!
        SierpinskiCarpet(len / 3, newCoordinates, iterations + 1);
      }
    }
  }
}
```

Interestingly, the resulting shape has an area of exactly 0. Because after infinitely many squares have been taken out, there is nothing "left" that could account for the area of a Sierpinski Carpet. It's effectively empty!

To me, these kinds of ideas sit at the beauty of fractals. You can have mathematical shapes that look beautiful and interesting, which have extremely counterintuitive properties, like 0 area, or infinite perimeters or infinite length, yet bounded areas and so on... 

Like many other fractals, this one has deep-reaching connections to other fractals... See also [Sierpinski Triangle](/l-system/sierpinski-triangle) and the Wikipedia article on the [Peano Curve](https://en.wikipedia.org/wiki/Peano_curve).
