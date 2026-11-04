# Newton Fractal

**Newton's method** looks for the place where a curve crosses zero, which is called a **root**. It repeats one step: at your current guess, draw the straight line that follows the curve's slope, and take the place where that line crosses zero as your next guess.<sup><a id="newton-fractal-ref-1" href="#newton-fractal-source-1">1</a></sup> Close to the guess the line is a simple approximation of the curve, so its crossing is much easier to find than the curve's.

The curve below is $x^3-1$, and its root is at $1$. Under the graph, the current step is worked out by hand. Try starting at $2$, then at $0.5$.

<figure data-lesson="newton"></figure>

Now start at $0.1$. The curve is nearly flat there, so the line crosses zero far away and the next guess is $33.4$. From out there, each step takes the guess to about two thirds of its distance. Start at $0$ and the line is flat, so it never crosses zero and there is no next guess.

The same rule works with complex numbers, which have a horizontal and a vertical coordinate, and with those $z^3-1=0$ has three roots, marked below. Move your pointer over the plane to choose a first guess, or tap on a phone. The line runs through every guess until one reaches a root.

<figure data-lesson="newton-route"></figure>

Close to a root, the guesses go straight in. Close to the center, they fly off the picture, come back, and can land on any root.

Because the first guess decides which root you reach, every pixel can get a color. The large picture at the top of this page tries a first guess at every pixel and gives it the color of the root it reaches. Below is the same picture, and each dot on the ring is a first guess, colored the same way.

<figure data-lesson="newton-ring"></figure>

Move the ring into a patch of color and every dot agrees. Move it onto a border between two colors and the third color nearly always appears. Click or tap to keep a spot on a border, then press **Zoom in**. The ring stays the same size on screen, so it now tests starts four times closer together. Put it on a border and zoom again, and the third color keeps appearing, because all three regions share one boundary: however closely you look at a boundary point, starts leading to all three roots are nearby.<sup><a id="newton-fractal-ref-2" href="#newton-fractal-source-1">1</a></sup>

The flat spot at $0$ causes this. Press **Around 0**, and the ring meets each color twice.

A guess near $0$ lands far away, at minus twice its angle from the line pointing right.<sup><a id="newton-fractal-ref-3" href="#newton-fractal-source-2">2</a></sup> So when a start goes once around a small circle, the landing spot goes twice around a huge circle, the other way. Guesses on that huge circle come back toward the center, each toward the root it faces, and going twice around means all three roots, twice.

Any start whose guesses land near $0$ gets thrown out in the same way, so the same thing happens around that start, on a smaller scale. The ring opens beside one: $(0.397, 0.687)$ lands on $0$ in one jump. Each spot where six slices of color meet is one of these starts, and they are packed along the whole boundary.<sup><a id="newton-fractal-ref-4" href="#newton-fractal-source-3">3</a></sup>

The large picture stops each calculation after 96 steps. A guess that has not reached a root by then uses the nearest root's color, so some pixels near a border can have the wrong color. The ring's picture leaves those pixels dark.

## Further exploring

### Videos

- [Newton’s Fractal — 3Blue1Brown](https://www.youtube.com/watch?v=-RdOwhmqP5s)
- [Beyond the Mandelbrot set, an intro to holomorphic dynamics — 3Blue1Brown](https://www.youtube.com/watch?v=LqbZpur38nw)

### Reading

- [Newton fractal — Wikipedia](https://en.wikipedia.org/wiki/Newton_fractal)
- [Fractals derived from Newton-Raphson iteration — Simon Tatham](https://www.chiark.greenend.org.uk/~sgtatham/newton/)

## Sources and notes

1. <span id="newton-fractal-source-1"></span> [À la recherche des racines perdues (In Search of Lost Roots)](https://arpi.unipi.it/bitstream/11568/777953/1/Abate_Newton2.pdf). Section 3 covers the shared boundary. [Back](#newton-fractal-ref-1) [Back](#newton-fractal-ref-2)
2. <span id="newton-fractal-source-2"></span> Calculation: $z-(z^3-1)/(3z^2)=\tfrac23z+1/(3z^2)$. Near $0$ the last term is far larger than the rest. Far from $0$ the first term is, which is why each step keeps about two thirds of the distance. [Back](#newton-fractal-ref-3)
3. <span id="newton-fractal-source-3"></span> [Dynamics in One Complex Variable: Introductory Lectures](https://arxiv.org/abs/math/9201272). Theorem 3.9 says the starts that land on a point of the boundary are dense in it; Problem 3-2 says each region's boundary is that same set. [Back](#newton-fractal-ref-4)
