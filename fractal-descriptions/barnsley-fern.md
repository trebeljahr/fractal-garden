# Barnsley Fern

Watch dots collect along a stem and its leaflets. Smaller leaflets repeat the shape of the whole fern. The picture comes from moving one point repeatedly, rather than drawing the outline of each leaf.

## Watch the dots build a leaf

A leaflet resembles a compressed copy of the whole fern. The large transformation sends most points toward the tip. The rarer transformations feed the stem and side leaflets.

Random choices change the order in which dots arrive. The transformations constrain where those dots can collect.

<figure data-article-images="fern"></figure>

## Four rules make the classic fern

At each step, the classic fern chooses one of four transformations. A transformation shrinks, turns or shifts the current point, then the renderer plots the new point.

- The stem rule compresses points onto a vertical line. It has a 1% chance of selection.
- The main rule makes a smaller, shifted copy toward the tip. It has an 85% chance.
- Two side rules place copies in the leaflets. Each has a 7% chance.

These probabilities belong to **Classic Barnsley**. The other fern styles use different transformations and probabilities.

<figure data-lesson="fern"></figure>

The highlighted copies show where each rule places the whole fern. A point can jump between those regions as different rules act on it. A short sequence need not match the long-run probabilities.

Each rule acts on the same point coordinates:

$$
\begin{pmatrix}x'\\y'\end{pmatrix}
= \begin{pmatrix}a&b\\c&d\end{pmatrix}
\begin{pmatrix}x\\y\end{pmatrix}
+ \begin{pmatrix}e\\f\end{pmatrix}
$$

The [Algorithm Archive's construction diagrams](https://www.algorithm-archive.org/contents/barnsley/barnsley.html) show which part each transformation produces. The [L-system ferns](/l-system/fern-1) grow with explicit branching instructions instead. The [fractal canopy](/fractal-canopy) also repeats smaller branches, with controls for their angles and lengths.
