# 3D Hilbert Curve

A single route visits every cell in a cube-shaped grid. Smaller routes turn within the eight octants, joining end to end without jumps.

## A line that visits a volume

An order-$n$ approximation visits $8^n$ cells in a grid with $2^n$ cells along each axis. It connects their centers with $8^n-1$ segments.

<figure data-investigation="hilbert-curve-3d"></figure>

Consecutive cells share a face. A flat projection can make strokes at different depths look crossed. Rotating the path reveals that hidden separation.

The limiting curve fills a cube and has dimension 3. Each finite route still consists of line segments. The [2D Hilbert curve](/l-system/hilbert-curve) follows the same broad idea inside a square.
