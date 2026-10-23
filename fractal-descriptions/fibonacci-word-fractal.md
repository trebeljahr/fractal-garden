# Fibonacci Word Fractal

The same zero can bend this path left or right. Its position in the word decides which turn follows the forward step.

## A word carries more than a count

Starting at 0, apply `0 → 01` and `1 → 0`. The words begin `0`, `01`, `010`, `01001`. Their lengths follow the Fibonacci recurrence.

<figure data-investigation="fibonacci-word-fractal"></figure>

Each digit draws one unit step. A zero then turns right at odd positions and left at even positions, counting from one. A one continues straight.

Two words with the same digit counts can trace different paths. The ordering and parity of those digits matter. The [Rauzy fractal](/rauzy-fractal) turns a related three-letter substitution into a planar tile.
