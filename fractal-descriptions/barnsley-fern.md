# Barnsley Fern

To draw this fern, start with a dot at the bottom of the stem. Pick one of four moves at random, move the dot, and draw it where it lands. Then do that again from the new spot, millions of times. The four moves take 24 numbers to write down, and those numbers store the whole fern.

Each move shrinks the dashed rectangle around the fern, slants it and places it somewhere else, which makes it a parallelogram, and every point inside the rectangle goes along. Each dot below has the color of the move that placed it.

<figure data-lesson="fern-collage"></figure>

Each parallelogram holds a copy of the whole fern. The big one holds everything above the lowest two leaflets. The left and right ones each hold one of those leaflets, and the right one is flipped. The stem's parallelogram is squashed flat, so its copy of the fern is a straight line.

Because the fern is exactly these four copies put together, a dot on the fern stays on the fern: whichever move comes next, it lands in one of the copies. The random choices only decide where the next dot goes.<sup><a id="barnsley-fern-ref-1" href="#barnsley-fern-source-1">1</a></sup> The [triangle's random dots](/l-system/sierpinski-triangle#move-one-dot) work the same way, with three moves that each go halfway to a corner.

## Six numbers per move

Each move is two lines of arithmetic:

$$\text{new } x = a x + b y + e$$

$$\text{new } y = c x + d y + f$$

Those six numbers are one row of the table.<sup><a id="barnsley-fern-ref-2" href="#barnsley-fern-source-2">2</a></sup>

Six is also what it takes to place a parallelogram, since you can choose three corners and the fourth follows. Three corners with two coordinates each, four times over, make 24 numbers and twelve dots to drag. You see eleven, because the stem is flat and two of its dots sit on top of each other.

Drag the top blue dot most of the way to the right-hand blue dot. The blue parallelogram turns thin, and so does every right-hand leaflet on the plant, all the way to the top, because the higher leaflets are copies of the lowest one, made by the big move.

Press **True fern** and pull the top stem dot sideways. The line opens into a tiny fern, which it was all along, squashed flat.

## Cover a shape, get that shape

This also works in reverse. If you take a shape you want and cover it with smaller copies of itself, those copies give you the moves, and the moves draw something close to your shape. This is the **collage theorem**.<sup><a id="barnsley-fern-ref-3" href="#barnsley-fern-source-1">1</a></sup> Barnsley and his colleagues got the fern this way, by covering a picture of a black spleenwort fern with four shrunken, slanted copies of itself and writing down six numbers for each.<sup><a id="barnsley-fern-ref-4" href="#barnsley-fern-source-1">1</a></sup>

With these moves, copies that match your shape to within 1 pixel draw a shape within 6.7 pixels of it.<sup><a id="barnsley-fern-ref-5" href="#barnsley-fern-source-3">3</a></sup>

Press **Cover the rectangle**. Four half-size parallelograms cover it exactly, so the dots fill it solid. Dragging the top-right green dot inward opens a gap, and the moves copy that gap into each of the four parts, then into the parts of those parts, until holes appear at every size.

All of this needs moves that shrink. Press **True fern** and drag the top-left green dot well past the rectangle's left edge. The Big row's $a$ passes 1, so the big move now stretches the picture and the dots spread everywhere.

## Chances

The table's last column says how often each move is picked. It isn't part of the 24, because it doesn't change the shape.<sup><a id="barnsley-fern-ref-6" href="#barnsley-fern-source-1">1</a></sup>

Press **True fern**, then **Equal**, which gives each move 25%. After ten million dots, every dot is still on the fern, but the top is thin and the tip is bare, because landing within a pixel of the tip takes 36 big moves in a row.<sup><a id="barnsley-fern-ref-7" href="#barnsley-fern-source-4">4</a></sup> At 85%, one dot in 350 manages that. At 25%, it's one dot in 5 × 10²¹, so at a hundred million dots a second you would wait about 1.5 million years for one.

Press **All four at once** and nothing is random anymore. Every move is applied to every point, and then to every result, until the pieces are smaller than a pixel. The whole fern appears, the same one you get at 85%.<sup><a id="barnsley-fern-ref-8" href="#barnsley-fern-source-1">1</a></sup>

## Further exploring

### Videos

- [Chaos Game — Numberphile](https://www.youtube.com/watch?v=kbKtFN71Lfs)

### Reading

- [Barnsley fern — Wikipedia](https://en.wikipedia.org/wiki/Barnsley_fern)
- [Barnsley’s fern — MathWorld](https://mathworld.wolfram.com/BarnsleysFern.html)
- [The Barnsley Fern — The Arcane Algorithm Archive](https://www.algorithm-archive.org/contents/barnsley/barnsley.html)

## Sources and notes

1. <span id="barnsley-fern-source-1"></span> [Solution of an inverse problem for fractals and other sets](https://pmc.ncbi.nlm.nih.gov/articles/PMC323212/). [Back](#barnsley-fern-ref-1) [Back](#barnsley-fern-ref-3) [Back](#barnsley-fern-ref-4) [Back](#barnsley-fern-ref-6) [Back](#barnsley-fern-ref-8)
2. <span id="barnsley-fern-source-2"></span> Calculation. The paper in note 1 writes each move as two turns, two scalings and a shift. Converted to $a$ through $f$ and rounded to two decimals, those are the numbers in the table. [Back](#barnsley-fern-ref-2)
3. <span id="barnsley-fern-source-3"></span> Calculation. The big move shrinks least. It multiplies distances by $\sqrt{0.85^2 + 0.04^2} = 0.851$. The others multiply them by at most 0.379. Call the gap between your shape and the drawn shape $d$. Applying the moves to both gives your copies, within 1 pixel of your shape, and the drawn shape again, at most $0.851\,d$ from your copies. So $d \le 1 + 0.851\,d$, which gives $d \le 6.7$. [Back](#barnsley-fern-ref-5)
4. <span id="barnsley-fern-source-4"></span> Calculation. The tip is the point the big move leaves in place, at (2.656, 9.959). The other three copies come no closer to it than 6.45. Each big move multiplies the distance to the tip by 0.851, and $6.45 \times 0.851^{36}$ is under 0.02, one pixel in a picture 560 pixels tall. Then $0.85^{36} \approx 1/347$ and $0.25^{36} \approx 1/(4.7 \times 10^{21})$. [Back](#barnsley-fern-ref-7)
