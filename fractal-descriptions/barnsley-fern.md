# Barnsley Fern

Watch dots collect along a stem and its leaflets. Smaller leaflets repeat the shape of the whole fern. The picture comes from moving one point repeatedly, rather than drawing the outline of each leaf.

## Watch the dots build a leaf

Open **Fern Studio** and compare **Classic Barnsley** with **Fishbone fern** or **Tree fern** under **Fern style**. A new style restarts the drawing. Wait for the dots to fill in, then compare the stems and the gaps between leaflets.

The dots arrive at random positions within the pattern. Changing **Color** or **Backdrop** changes the picture's appearance, while the selected fern style supplies its shape.

<figure data-article-images="fern"></figure>

## Four rules make the classic fern

At each step, the classic fern chooses one of four transformations. A transformation shrinks, turns or shifts the current point, then the renderer plots the new point.

- The stem rule compresses points onto a vertical line. It has a 1% chance of selection.
- The main rule makes a smaller, shifted copy toward the tip. It has an 85% chance.
- Two side rules place copies in the leaflets. Each has a 7% chance.

These probabilities belong to **Classic Barnsley**. The other fern styles use different transformations and probabilities.

Each rule acts on the same point coordinates:

$$
\begin{pmatrix}x'\\y'\end{pmatrix}
= \begin{pmatrix}a&b\\c&d\end{pmatrix}
\begin{pmatrix}x\\y\end{pmatrix}
+ \begin{pmatrix}e\\f\end{pmatrix}
$$

The [Algorithm Archive's construction diagrams](https://www.algorithm-archive.org/contents/barnsley/barnsley.html) show which part each transformation produces. The [L-system ferns](/l-system/fern-1) grow with explicit branching instructions instead. The [fractal canopy](/fractal-canopy) also repeats smaller branches, with controls for their angles and lengths.
