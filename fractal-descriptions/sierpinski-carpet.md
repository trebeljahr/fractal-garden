# Sierpinski Carpet

Divide a square into nine little squares. Remove the middle one. Do the same inside each of the eight squares left behind.

A hole appears inside every smaller square. Repeat, and smaller holes appear around those holes.<sup><a id="sierpinski-carpet-ref-1" href="#sierpinski-carpet-source-1">1</a></sup>

<figure data-construction-player="carpet"></figure>

## How much is left?

Each round keeps eight ninths of the previous area. After $n$ rounds, the fraction left is:

$$
A_n=\left(\frac89\right)^n.
$$

Keep going forever and that fraction falls to zero. The carpet still contains points, including the whole outside border. Zero area does not mean nothing remains.

We keep the borders of the holes too. The endless carpet stays connected, even though no filled patch survives.

<figure data-article-images="carpet"></figure>

## Find it on a cube

Each outer face of the [Menger sponge](/menger-sponge) is a Sierpinski carpet. Look straight at a face with parallel viewing rays, and the sponge's shadow has that pattern too.

A diagonal cut through the sponge gives six-pointed star holes instead. A shadow combines everything along your line of sight. A slice shows only one flat cut. The Menger page lets you compare them.

The [2D Vicsek fractal](/vicsek-fractal-2d) starts with the same nine-square grid but keeps only five squares each round.

## Sources and notes

1. <span id="sierpinski-carpet-source-1"></span> Mario Bonk, [Uniformization of Sierpiński carpets in the plane](https://arxiv.org/pdf/1009.4094), Inventiones Mathematicae 186 (2011), 559–665, Corollary 1.2 and §12. Standard carpet construction and connectedness. The area fraction follows directly from this explorer’s eight-of-nine rule. [Back](#sierpinski-carpet-ref-1)
