# Rauzy Fractal

The Rauzy Fractal looks like a blob of three colored puzzle pieces with fuzzy, crinkly borders. It comes from a very small rule about words, studied by Gérard Rauzy in 1982.

Start with the letter `1` and repeatedly apply the tribonacci substitution:

$$
1 \to 12, \qquad 2 \to 13, \qquad 3 \to 1
$$

This gives `1`, `12`, `1213`, `1213121`, `1213121121312`, … Each word is the start of the next one, so in the limit you get one infinite word. The lengths are the tribonacci numbers $1, 2, 4, 7, 13, 24, \dots$, where each number is the sum of the three before it. That is the same idea as the [Fibonacci Word Fractal](/l-system/fibonacci-word-fractal), just with three letters instead of two.

Now turn the word into a path in 3D space. Read it letter by letter and take one step along the $x$, $y$ or $z$ axis for each `1`, `2` or `3`. That staircase grows in the direction of the eigenvector of the substitution matrix

$$
M = \begin{pmatrix} 1 & 1 & 1 \\ 1 & 0 & 0 \\ 0 & 1 & 0 \end{pmatrix}
$$

that belongs to the tribonacci constant $\beta \approx 1.8393$, the real root of $x^3 = x^2 + x + 1$. The two other eigenvalues are complex with $|\alpha| = 1/\sqrt{\beta} < 1$. Their plane is the contracting plane. When you project every corner of the staircase onto it along the growing direction, the points do not wander off. They stay in a bounded region and fill in the Rauzy Fractal.

Each point is colored by the letter that comes right after it. This splits the shape into three pieces, and each piece is a shrunken, rotated copy of the whole, scaled by the complex number $\alpha$. The tile itself has positive area, so its dimension is $2$. Its boundary is a true fractal curve with Hausdorff dimension of about $1.0933$.

The pieces fit together without gaps, and copies of the whole shape tile the plane. In number theory and dynamical systems it shows how the tribonacci word, a rotation on a 2D torus and $\beta$-expansions of numbers are the same thing in disguise.

Use the points slider to watch the shape fill in. Fewer points show the order in which the walk visits the tile, more points sharpen the borders.
