# Sierpinski Carpet

Divide a square into a three-by-three grid and remove the center square. Do the same to each of the eight squares that remain, then to each square left after that, and so on.<sup><a id="sierpinski-carpet-ref-1" href="#sierpinski-carpet-source-1">1</a></sup>

<figure data-construction-player="carpet"></figure>

Each step removes only the inside of a square, so its edges stay, and because every patch of the square eventually gets a hole, the finished carpet has no filled patch. It is still one piece,<sup><a id="sierpinski-carpet-ref-2" href="#sierpinski-carpet-source-2">2</a></sup> and after every step the remaining squares share sides.

That makes the carpet look like a net of hole edges, but those edges can't be what holds it together. No two holes touch, because after every step each hole has carpet all around it, so their edges are separate loops and other points must do the joining.

A straight line across the square, one quarter of the way up, is made of such points. It stays on the carpet all the way across, without ever entering a hole or touching a hole's edge.

<figure data-lesson="carpet-line"></figure>

Move your pointer over the picture, or tap, to try another height, and click to keep it. Holes the line passes through turn red.

**1/2** goes through the big center hole, and through more holes at each level. **1/3** enters no hole, but it runs along the bottom edge of the big one. Press **1/4** and raise the level, and the line enters no hole and runs along no edge. Move it a little off 1/4 and the readout names the level of its first hole.

To see why 1/4 works, remember that every remaining square gets its own grid, with its hole in the middle row. One quarter of the way up the square is in the bottom row, three quarters of the way up that row, so in each square of that row the line is three quarters of the way up. That is in the top row of their grids, one quarter of the way up that row, so in each square of that row the line is one quarter of the way up again, and the same two steps repeat forever. Every hole and every hole edge lies in a middle row or on the border between two rows, and the line is never in either place.

Straight lines are not the only things that fit. In 1916 Sierpiński proved that any curve you can draw has a copy in the carpet.<sup><a id="sierpinski-carpet-ref-3" href="#sierpinski-carpet-source-1">1</a></sup> A curve here means one connected piece with no filled patch, so a scribble that fills a region does not count. His proof starts with the curve and removes rectangles from spots it misses, in the same rows and columns as the carpet's holes. What is left holds the whole curve, and it is the carpet with its rows and columns stretched to uneven widths, so the copy in the real carpet is a stretched version of the curve.

The [Menger sponge](/menger-sponge) applies a related removal rule to cubes, and each outside face of the sponge has this carpet pattern.

## Further exploring

### Videos

- [A 1.58-Dimensional Object — Numberphile](https://www.youtube.com/watch?v=FnRhnZbDprE)

### Reading

- [Sierpiński carpet — Wikipedia](https://en.wikipedia.org/wiki/Sierpi%C5%84ski_carpet)
- [Sierpiński carpet — MathWorld](https://mathworld.wolfram.com/SierpinskiCarpet.html)
- [Sierpinski Carpet — Larry Riddle](https://larryriddle.agnesscott.org/ifs/carpet/carpet.htm)
- [Sierpinski Carpet — AMS Visual Insight](https://blogs.ams.org/visualinsight/2014/07/01/sierpinski-carpet/)

## Sources and notes

1. <span id="sierpinski-carpet-source-1"></span> Wacław Sierpiński, [On a Cantor curve which contains a one-to-one and continuous image of any given curve](https://sites.gatech.edu/kbooth8/files/2021/08/sierpinskitranslation_1.pdf), English translation by Katherine Williams Booth of a note in Comptes Rendus 162 (1916), 629–632. [Back](#sierpinski-carpet-ref-1) [Back](#sierpinski-carpet-ref-3)
2. <span id="sierpinski-carpet-source-2"></span> Mario Bonk, [Uniformization of Sierpiński carpets in the plane](https://arxiv.org/pdf/1009.4094), Inventiones Mathematicae 186 (2011), 559–665, §12. [Back](#sierpinski-carpet-ref-2)
