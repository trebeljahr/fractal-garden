# Twindragon

Make two copies of a [dragon curve](/l-system/dragon-curve) and rotate the second by 180 degrees around the midpoint between the first curve's endpoints. The second curve then starts at the first curve's end and finishes at its start, so the two paths form a closed route. The two colors below show the original copy and the rotated copy.

<figure data-construction-player="twindragon"></figure>

Finite paths leave gaps, which get harder to see as raising the level makes the segments smaller. The infinite paths fill a whole region, including its interior.<sup><a id="twindragon-ref-1" href="#twindragon-source-1">1</a></sup>

Choose **Tiling** and raise the level, and the copies use every line of a square mesh exactly once.<sup><a id="twindragon-ref-2" href="#twindragon-source-2">2</a></sup> In the infinite limit, copies of the filled region, shifted along a square grid, cover the plane without gaps or overlaps.<sup><a id="twindragon-ref-3" href="#twindragon-source-1">1</a></sup> The reason these jagged edges fit comes from a way of writing numbers.

In ordinary binary, the digits are 0 and 1, and each place is worth half the place to its left. Every number is a whole part plus a fraction, and the fractions fill the stretch from 0 to 1, so a copy of that stretch at every whole number covers the whole line.

Now write positions on a plane instead of numbers on a line. Each place is a step, which digit 1 takes and digit 0 skips, and each place to the right is a step 0.71 times as long, turned 135 degrees counterclockwise. The small arrow on each digit shows which way its step points.

<figure data-lesson="twindragon-digits"></figure>

Press a digit to flip it, or point at a spot to read its digits. With enough digits after the point, the spots you can reach fill a tile in the twindragon's shape.<sup><a id="twindragon-ref-4" href="#twindragon-source-1">1</a></sup> It is the same shape the two dragons fill here.<sup><a id="twindragon-ref-5" href="#twindragon-source-3">3</a></sup>

Now raise **Whole digits**. The digit just before the point is one grid step straight up, and each place to its left is 1.41 times as long, turned 135 degrees clockwise. Each new digit doubles the number of tiles, and the new tiles land on empty grid points, so together they make the same shape again, larger. The dots mark the grid points, where all the fraction digits are 0.

Every grid point on the plane has exactly one row of whole digits, so this system needs no minus sign.<sup><a id="twindragon-ref-6" href="#twindragon-source-1">1</a></sup> Moving the point to the left puts the same rows on a finer, turned copy of the grid, so rows of digits get as close as you like to any spot. Every spot is therefore a grid point plus a fraction, which means a copy of the fraction shape at each grid point covers the plane. The twindragon does the job of the stretch from 0 to 1.

A spot on the edge between tiles has more than one row of digits, the same way 0.1111… and 1.0000… name one number in binary.<sup><a id="twindragon-ref-7" href="#twindragon-source-1">1</a></sup>

## Further exploring

- [Twindragon — Wikipedia](https://en.wikipedia.org/wiki/Dragon_curve#Twindragon)
- [Twindragon — MathWorld](https://mathworld.wolfram.com/Twindragon.html)
- [Twindragon — Larry Riddle](https://larryriddle.agnesscott.org/ifs/heighway/twindragon.htm)
- [Twindragon Boundary — Larry Riddle](https://larryriddle.agnesscott.org/ifs/heighway/twindragonBoundary.htm)
- [Base −1 ± i — Wikipedia](https://en.wikipedia.org/wiki/Complex-base_system#Base_%E2%88%921_%C2%B1_i)

## Sources and notes

1. <span id="twindragon-source-1"></span> [The Fractal Dimension of Sets Derived from Complex Bases](https://doi.org/10.4153/CMB-1986-078-1). [Back](#twindragon-ref-1) [Back](#twindragon-ref-3) [Back](#twindragon-ref-4) [Back](#twindragon-ref-6) [Back](#twindragon-ref-7)
2. <span id="twindragon-source-2"></span> Calculation. Checked for levels 1 to 12 by listing the lines each copy draws. [Back](#twindragon-ref-2)
3. <span id="twindragon-source-3"></span> Calculation. The steps above are base −1 − i, whose tile is the mirror image of the published base −1 + i tile. Put the first dragon's ends at (0, 0) and (1, 0), and start the steps at (0.6, 0.2) with the place before the point one unit up. At level 14, every corner of the drawing lies within 0.004 of a 16-digit fraction, and every 16-digit fraction lies within 0.004 of a corner. [Back](#twindragon-ref-5)
