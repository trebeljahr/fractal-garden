# Burning Ship Fractal

Look for the hull near the bottom and the thin masts above it. Zoom into a mast, and you can find smaller ships.

The rule starts like the [Mandelbrot set](/mandelbrot): begin at zero, square, add a number $c$, and repeat. But before each square, make both coordinates positive or zero. A point to the left flips right. A point below zero flips above it.

That extra fold changes the whole picture. Michael Michelitsch and Otto Rössler introduced it in 1992.<sup><a id="burning-ship-ref-1" href="#burning-ship-source-1">1</a></sup>

<figure data-article-images="burning-ship"></figure>

Each pixel chooses a different $c$. If its moving point runs away, the pixel gets a color. The color records how quickly it escapes.

The rule, written in one line, is:

$$
z_{n+1}=\left(|\operatorname{Re}(z_n)|+i|\operatorname{Im}(z_n)|\right)^2+c.
$$

The bars mean “ignore the minus sign.” The two parts inside the brackets are the point's horizontal and vertical coordinates.

<figure data-orbit="burning-ship"></figure>

The main image flips the usual vertical direction to put the ship upright. The small orbit diagram keeps the usual mathematical direction, with positive values upward.

Small ships appear around values of $c$ whose journeys return to zero. Those returns give researchers a way to find their centers.<sup><a id="burning-ship-ref-2" href="#burning-ship-source-2">2</a></sup>

A black pixel means no escape was found before the time limit. Some points need longer, so a black pixel is not proof that it stays forever.

The [Julia explorer](/julia-set) keeps $c$ fixed and changes the starting point instead.

## Sources and notes

1. <span id="burning-ship-source-1"></span> Michael Michelitsch and Otto E. Rössler, [The “burning ship” and its quasi-Julia sets](https://www.sciencedirect.com/science/article/pii/009784939290032Q), *Computers & Graphics* 16(4) (1992), 435–438. Original paper's public abstract confirms the nonanalytic construction and quasi-Julia family. [Back](#burning-ship-ref-1)
2. <span id="burning-ship-source-2"></span> Claude Heiland-Allen, [At the Helm of the Burning Ship](https://mathr.co.uk/helm/AtTheHelmOfTheBurningShip-Paper.pdf), *Electronic Visualisation and the Arts* (2019), 402–408. Gives the real-coordinate recurrence, axis convention, periodic mini-ships and Jacobian methods. [Back](#burning-ship-ref-2)
