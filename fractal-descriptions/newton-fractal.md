# Newton Fractal

We want to find where a curve crosses zero. Start with a guess. Draw a straight line through the curve at that point, following its slope. Nearby, the line is a simple approximation of the curve.

Where the line crosses zero gives us the next guess. Move there and repeat. This is **Newton's method**; the answer we are looking for is called a **root**.<sup><a id="newton-fractal-ref-1" href="#newton-fractal-source-1">1</a></sup>

Try starting at $2$, then at $0.5$. Follow the guesses as they approach $1$. What happens if you start where the curve is flat?

<figure data-lesson="newton"></figure>

Now choose **Three roots**. The same rule works with complex numbers, which have horizontal and vertical coordinates. The equation $z^3-1=0$ has three roots. Changing the starting point can send the guesses toward a different one.

The large picture tries a starting point at every pixel. Each color stands for one root. Nearby starting points often reach the same root, making the broad patches of color.

Zoom into a border between two colors. Pieces of the third keep appearing. All three regions share the same boundary: however closely you zoom at a boundary point, starts leading to all three roots remain nearby.<sup><a id="newton-fractal-ref-2" href="#newton-fractal-source-2">2</a></sup>

The picture stops each calculation after 48 steps. If a guess has not reached a root, it uses the nearest root's color. Some pixels near a border can therefore have the wrong color.

## Further reading

- [Newton fractal — Wikipedia](https://en.wikipedia.org/wiki/Newton_fractal)
- [Newton’s Fractal — 3Blue1Brown](https://www.3blue1brown.com/lessons/newtons-fractal/)

## Sources and notes

1. <span id="newton-fractal-source-1"></span> [À la recherche des racines perdues (In Search of Lost Roots)](https://arpi.unipi.it/bitstream/11568/777953/1/Abate_Newton2.pdf). [Back](#newton-fractal-ref-1)
2. <span id="newton-fractal-source-2"></span> [À la recherche des racines perdues (In Search of Lost Roots)](https://arpi.unipi.it/bitstream/11568/777953/1/Abate_Newton2.pdf), section 3. [Back](#newton-fractal-ref-2)
