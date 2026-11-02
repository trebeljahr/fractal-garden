# Star Fractal

Draw a five-pointed star without lifting your pen: mark five points evenly around a circle, then join every second point. Now put a smaller star on each of the five tips, facing the same way, and repeat. Each round multiplies the number of new stars by five: 1, 5, 25, 125.

MathWorld describes a star fractal as repeated copies of a pentagram, and leaves the details open.<sup><a id="star-fractal-ref-1" href="#star-fractal-source-1">1</a></sup> This page centers each copy on a tip.

<figure data-construction-player="star-fractal"></figure>

How big should the copies be? Too large and the groups of stars run into each other. Too small and they sit apart. Between those there is one exact size where neighboring groups just touch: about 0.382 of the parent's size.<sup><a id="star-fractal-ref-2" href="#star-fractal-source-2">2</a></sup>

That number is already in the star. Each long line of a five-pointed star is crossed twice, and the piece from a tip to the first crossing is 0.382 of the whole line.<sup><a id="star-fractal-ref-3" href="#star-fractal-source-3">3</a></sup> So at this size, the long lines of a small star have the same length as that tip piece of its parent.

<figure data-lesson="star-fractal"></figure>

Go to the touching size and show only the smallest stars. You have seen this arrangement before: it is the pentagon [N-flake](/n-flake). Both constructions shrink by 0.382 and place five copies in the same five directions.<sup><a id="star-fractal-ref-4" href="#star-fractal-source-4">4</a></sup> Only the drawing at each spot differs, so the two share the same limit.

**Distance from center**, in **Exploration controls**, places the copies inside or outside the tips, as in MathWorld's second picture. **Tips** uses another number of points. Copies still touch at the N-flake size for that number.

## Sources and notes

1. <span id="star-fractal-source-1"></span> [Star Fractal](https://mathworld.wolfram.com/StarFractal.html). [Back](#star-fractal-ref-1)
2. <span id="star-fractal-source-2"></span> Calculation. A whole group of copies reaches $1/(1-r)$ times the size of its first star. Setting the neighboring groups side by side gives the N-flake equation, whose solution for five copies is $1/(1+\varphi) = 0.382$. [Back](#star-fractal-ref-2)
3. <span id="star-fractal-source-3"></span> [Euclid's Elements, Book XIII, Proposition 8](https://mathcs.clarku.edu/~djoyce/java/elements/bookXIII/propXIII8.html), where lines across a pentagon cut each other in the golden ratio. The tip piece is $1/\varphi^2$ of the line. [Back](#star-fractal-ref-3)
4. <span id="star-fractal-source-4"></span> [Pentaflake](https://mathworld.wolfram.com/Pentaflake.html). [Back](#star-fractal-ref-4)
