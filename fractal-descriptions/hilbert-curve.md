# Hilbert Curve

Look for a small U-shaped path repeated inside four smaller squares. The copies turn to meet at their ends, making one continuous route through a square grid. Each stage adds a finer grid without crossing an earlier part of that stage's path.

## Letters that draw and letters that rewrite

This page starts with **W**. Two replacement rules expand **V** and **W** into smaller copies joined by forward moves and turns. **F** draws a segment. **V** and **W** do not draw; they carry instructions for the next rewrite.

<figure data-lesson="lsystem-hilbert"></figure>

The initial W draws nothing. Its first rewrite creates a U with three segments. W and V guide future replacements without adding strokes.

Each smaller U turns to meet its neighbors. Those orientation changes let one continuous route visit every cell without jumping between disconnected paths.

## A finite grid and an infinite limit

After $n$ rewrites, the finite path visits the points of a $2^n$ by $2^n$ grid. It has:

$$
N_n = 4^n - 1
$$

segments. The scaled paths approach a continuous curve that fills a square as the number of rewrites grows without limit. A finite drawing still consists of line segments and leaves gaps.

Points near each other along the path stay near each other in the square. The reverse does not always hold: nearby positions in the square can lie far apart along the path.

The [3D Hilbert curve](/l-system/hilbert-curve-3d) applies a related arrangement to cubes. The [Dragon curve](/l-system/dragon-curve) also grows through right-angle turns, while the [Sierpinski curve](/l-system/sierpinski-curve) uses another route through nested squares.
