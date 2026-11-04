# Sierpinski Carpet

Divide a square into a three-by-three grid and remove the center square. Repeat this for each of the eight remaining squares, then for each square left after that, and so on.<sup><a id="sierpinski-carpet-ref-1" href="#sierpinski-carpet-source-1">1</a></sup>

<figure data-construction-player="carpet"></figure>

Each step removes only the inside of a square, so its edges stay. Every patch of the square eventually gets a hole, so the finished carpet has no filled patch. It is still one piece.<sup><a id="sierpinski-carpet-ref-2" href="#sierpinski-carpet-source-2">2</a></sup> After every step, the remaining squares share sides.

You might picture the finished carpet as a net made of hole edges. But no two holes touch: after every step, each hole has carpet all around it. Their edges are separate loops, so they cannot hold the carpet together by themselves. Other points must do that.

A straight line across the square, one quarter of the way up, is made of such points. It stays on the carpet all the way across. It never enters a hole and never touches a hole's edge.

<figure data-lesson="carpet-line"></figure>

Move your pointer over the picture, or tap, to try another height. Click to keep it. Holes the line passes through turn red.

Press **1/2**. The line goes through the big center hole, and through more holes at each level. Press **1/3**. It enters no hole, but it runs along the bottom edge of the big one. Press **1/4** and raise the level. It enters no hole and runs along no edge. Move it a little off 1/4, and the readout names the level of its first hole.

Here is why 1/4 works. Every remaining square gets its own grid, and its hole sits in the middle row of that grid. One quarter of the way up the square is in the bottom row, three quarters of the way up that row. So in each square of that row, the line is three quarters of the way up. That is in the top row of their grids, one quarter of the way up that row. So in each square of that row, the line is one quarter of the way up again, and the same two steps repeat forever. The line is never in a middle row and never on the border between two rows. Every hole and every hole edge lies in one of those places.

Straight lines are not the only things that fit. In 1916 Sierpiński proved that any curve you can draw has a copy in the carpet.<sup><a id="sierpinski-carpet-ref-3" href="#sierpinski-carpet-source-1">1</a></sup> A curve here means one connected piece with no filled patch, so a scribble that fills a region does not count. His proof starts with the curve and removes rectangles from spots it misses, in the same rows and columns as the carpet's holes. What is left holds the whole curve. It is the carpet with its rows and columns stretched to uneven widths, so the copy in the real carpet is a stretched version of the curve.

The [Menger sponge](/menger-sponge) applies a related removal rule to cubes. Each outside face of the sponge has this carpet pattern.

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
