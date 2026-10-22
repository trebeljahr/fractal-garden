# Pythagoras Tree

Look for squares that split into two smaller squares through a triangular gap. Each smaller square starts another pair of branches. At 45 degrees, the two sides grow symmetrically. Other angles make one side's squares larger than the other's.

## Build a fork from a square

Start with one square. Place a right triangle on its top edge, using that edge as the triangle's hypotenuse. Draw a new square on each of the triangle's other sides. Repeat on both new squares.

Open **Pattern Studio** and turn off **Animate growth**. Set **Iterations** to zero to see the first square, then add levels one at a time. Change **Angle** from 45 degrees toward 30 or 60 degrees to compare the two sides.

Use **Fill triangles** and **Fill squares** to distinguish the connecting triangles from the squares. Their outlines remain visible when you turn the fill off.

## Why the sizes fit

Pythagoras' theorem says that the two smaller squares' areas add up to their parent's area. For parent side length $s$ and triangle angle $\theta$, their side lengths are:

$$
s_1 = s\cos\theta, \qquad s_2 = s\sin\theta
$$

At 45 degrees, both children have side length $s/\sqrt{2}$. As branches grow deeper, squares can overlap. Adding the individual squares' areas therefore does not measure the area covered by the whole tree.

The [fractal canopy](/fractal-canopy) makes forks from line segments. The [T-square fractal](/t-square-fractal) places smaller squares at four corners instead of using triangles.
