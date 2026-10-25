# Newton Fractal

Choose a starting guess. Draw a straight line that touches the curve there and follows its slope. Where the line crosses the bottom axis is your next guess. Repeat from there.<sup><a id="newton-fractal-ref-1" href="#newton-fractal-source-1">1</a></sup>

This is Newton's method for finding a **root**, where the curve meets zero. Near a root where the curve isn't flat, each step roughly doubles the number of correct digits.

<figure data-lesson="newton"></figure>

The main picture applies the same calculation to $z^3-1$. With complex numbers, there are three roots. Each pixel supplies a starting guess, and its color shows which root the calculation approaches.

Nearby guesses often reach the same root, making the broad patches of color. Along the borders, a tiny move can send a guess toward a different root.

All three colored regions share a boundary. However closely you zoom at a boundary point, you can find starts leading to each of the three roots.<sup><a id="newton-fractal-ref-2" href="#newton-fractal-source-2">2</a></sup> That is why a border between two colors keeps revealing pieces of the third.

The computer stops after 48 steps. A guess that still hasn't reached a root gets the color of the nearest one. Some pixels near the borders can have the wrong color for this reason.

## Further reading

- [Newton fractal — Wikipedia](https://en.wikipedia.org/wiki/Newton_fractal)
- [Newton’s Fractal — 3Blue1Brown](https://www.3blue1brown.com/lessons/newtons-fractal/)

## Sources and notes

1. <span id="newton-fractal-source-1"></span> Marco Abate, [À la recherche des racines perdues (In Search of Lost Roots)](https://arpi.unipi.it/bitstream/11568/777953/1/Abate_Newton2.pdf), lecture of 23 March 2013, sections 1–2. Explains tangent iteration, local quadratic convergence, and basins. [Back](#newton-fractal-ref-1)
2. <span id="newton-fractal-source-2"></span> Abate, same lecture, section 3. Explains the common basin boundary and Fatou's work. See also Grant Sanderson, [Newton's Fractal](https://www.3blue1brown.com/lessons/newtons-fractal/), 3Blue1Brown video lesson, 12 October 2021, especially 17:56 onward. [Back](#newton-fractal-ref-2)
