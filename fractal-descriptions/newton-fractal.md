# Newton Fractal

Newton's method improves a guess at where a function equals zero. Draw a tangent at your guess on the graph. The tangent meets the horizontal axis at a new guess. Repeat from there.<sup><a id="newton-fractal-ref-1" href="#newton-fractal-source-1">1</a></sup>

The little diagram starts with this graph construction. Once a guess is close enough to a simple root, each step roughly doubles its number of correct digits.

<figure data-lesson="newton"></figure>

The main picture applies the same calculation to $z^3-1$. With complex numbers, there are three roots. Each pixel supplies a starting guess, and its color shows which root the calculation approaches.

Nearby guesses often reach the same root, making the broad patches of color. Along the borders, a tiny move can send a guess toward a different root.

All three colored regions share a boundary. However closely you zoom at a boundary point, you can find starts leading to each of the three roots.<sup><a id="newton-fractal-ref-2" href="#newton-fractal-source-2">2</a></sup> That is why a border between two colors keeps revealing pieces of the third.

At zero the calculation divides by zero, and nearby guesses can jump a long way. The renderer stops after 48 steps. If it hasn't found a root, it uses the root nearest the final guess for coloring. Those unresolved pixels can therefore have a misleading color.

## Sources and notes

1. <span id="newton-fractal-source-1"></span> Marco Abate, [À la recherche des racines perdues (In Search of Lost Roots)](https://arpi.unipi.it/bitstream/11568/777953/1/Abate_Newton2.pdf), lecture of 23 March 2013, sections 1–2. Explains tangent iteration, local quadratic convergence, and basins. [Back](#newton-fractal-ref-1)
2. <span id="newton-fractal-source-2"></span> Abate, same lecture, section 3. Explains the common basin boundary and Fatou's work. See also Grant Sanderson, [Newton's Fractal](https://www.3blue1brown.com/lessons/newtons-fractal/), 3Blue1Brown video lesson, 12 October 2021, especially 17:56 onward. [Back](#newton-fractal-ref-2)
