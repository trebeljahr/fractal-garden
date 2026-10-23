# Newton Fractal

Make a guess. Improve it. Repeat until you find an answer.

Newton's method finds where a function equals zero. On a graph, draw the tangent at your guess. Where that line crosses the horizontal axis becomes your next guess.<sup><a id="newton-fractal-ref-1" href="#newton-fractal-source-1">1</a></sup>

<figure data-lesson="newton"></figure>

This picture solves $z^3=1$. There are three answers when $z$ can be a complex number. Each pixel starts from a different guess and gets the color of the answer it approaches.

The update rule is:

$$
z_{n+1}=z_n-\frac{z_n^3-1}{3z_n^2}.
$$

Close to an answer, it works fast. Roughly speaking, the number of correct digits doubles with each step once the guess is close enough.

## Why do three colors keep meeting?

Zoom into a border. Between two colors, pieces of the third keep appearing. All three regions share the same boundary. However closely you inspect a boundary point, starting guesses for all three answers are nearby.<sup><a id="newton-fractal-ref-2" href="#newton-fractal-source-2">2</a></sup>

Grant Sanderson's [animated explanation](https://www.youtube.com/watch?v=-RdOwhmqP5s) builds this picture from the tangent method.

There is a trap at zero: the update divides by zero. Nearby guesses can make enormous jumps before coming back toward an answer.

The renderer stops after 48 updates. If a pixel has not settled, it gets the color of the answer nearest its last position. That color is an estimate of where it might finish.

The [Julia explorer](/julia-set) makes another picture by repeatedly applying a rule to each starting point.

## Sources and notes

1. <span id="newton-fractal-source-1"></span> Marco Abate, [À la recherche des racines perdues (In Search of Lost Roots)](https://arpi.unipi.it/bitstream/11568/777953/1/Abate_Newton2.pdf), lecture of 23 March 2013, sections 1–2. Explains tangent iteration, local quadratic convergence, and basins. [Back](#newton-fractal-ref-1)
2. <span id="newton-fractal-source-2"></span> Abate, same lecture, section 3. Explains the common basin boundary and Fatou's work. See also Grant Sanderson, [Newton's Fractal](https://www.3blue1brown.com/lessons/newtons-fractal/), 3Blue1Brown video lesson, 12 October 2021, especially 17:56 onward. [Back](#newton-fractal-ref-2)
