# Penrose Tiling

A pattern of square tiles repeats: slide it one tile-width and the squares line up again. A Penrose tiling also covers the plane with just two shapes, here a kite and a dart. Try to slide it onto itself.

In the picture below, the ringed tile can land on any tile with a dot, which has the same shape and faces the same way. Move your pointer over the picture to choose one, or tap on a phone. The whole pattern slides with it. Bright tiles land exactly on an identical tile.

<figure data-lesson="penrose-slide"></figure>

Choose **Square tiles** and every slide lines up everything. Go back and press **Best slide**. Large parts line up, with dim seams running between them. On an infinite kite-and-dart tiling, no slide lines up everything.

A picture can't prove that. Any patch of tiles appears again somewhere, so a long enough slide would line up every tile shown here.<sup><a id="penrose-tiling-ref-1" href="#penrose-tiling-source-1">1</a></sup> Counting can.

Cut each kite and dart in half along its line of symmetry. A kite gives two narrow triangles and a dart gives two wide ones. Now divide each triangle again. A narrow one becomes two narrow and one wide. A wide one becomes one narrow and one wide. The outside edges stay where they are, and the smaller triangles join into smaller kites and darts. On the first step, the marked points split an edge so one part is about 1.618 times the other. This ratio is called the **golden ratio**.

<figure data-lesson="penrose"></figure>

Step through and read the last column. After three steps there are 13 narrow triangles and 8 wide ones, a ratio of 1.625. After six it is 233 to 144, about 1.618. It heads for the golden ratio from either starting triangle.

Every correctly matched tiling of kites and darts is built this way, so a huge patch of one always has about 1.618 kites per dart.<sup><a id="penrose-tiling-ref-2" href="#penrose-tiling-source-2">2</a></sup>

Now suppose a tiling did repeat. One block of tiles would copy across the whole plane, and that block holds a whole number of kites and a whole number of darts. So the ratio across the plane would be one whole number divided by another. The golden ratio is not one whole number divided by another, so the tiling can't repeat.<sup><a id="penrose-tiling-ref-3" href="#penrose-tiling-source-2">2</a></sup>

This depends on the matching rules along the tiles' edges.<sup><a id="penrose-tiling-ref-4" href="#penrose-tiling-source-3">3</a></sup> Using the two shapes without those rules does not guarantee a nonrepeating tiling. The explorer also offers **thick and thin rhombi**, a second pair with matching rules of its own.

## Further exploring

### Videos

- [The Infinite Pattern That Never Repeats — Veritasium](https://www.youtube.com/watch?v=48sCx-wBs34)

### Reading

- [Penrose tiles — MathWorld](https://mathworld.wolfram.com/PenroseTiles.html)
- [Penrose Tiling Explained — Jeff Preshing](https://preshing.com/20110831/penrose-tiling-explained/)

## Sources and notes

1. <span id="penrose-tiling-source-1"></span> [Penrose tiling](https://en.wikipedia.org/wiki/Penrose_tiling). [Back](#penrose-tiling-ref-1)
2. <span id="penrose-tiling-source-2"></span> [Pentaplexity: A Class of Non-Periodic Tilings of the Plane](https://web.ma.utexas.edu/users/radin/Pentaplexity.pdf). [Back](#penrose-tiling-ref-2) [Back](#penrose-tiling-ref-3)
3. <span id="penrose-tiling-source-3"></span> [Penrose Rhomb](https://tilings.math.uni-bielefeld.de/substitution/penrose-rhomb/). [Back](#penrose-tiling-ref-4)
