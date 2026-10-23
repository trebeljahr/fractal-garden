# Pythagoras Tree

Look for squares that split into two smaller squares through a triangular gap. Each smaller square starts another pair of branches. At 45 degrees, the two sides grow symmetrically. Other angles make one side's squares larger than the other's.

## Build a fork from a square

Start with one square. Place a right triangle on its top edge, using that edge as the triangle's hypotenuse. Draw a new square on each of the triangle's other sides. Repeat on both new squares.

<figure data-lesson="pythagoras"></figure>

Changing the triangle angle changes the child squares’ sizes. Their combined area stays equal to the parent’s.

At 30 degrees, the two child areas are three quarters and one quarter of the parent area. At 45 degrees, they are equal.

The triangle transmits both size and orientation to the next pair of squares. A skewed fork repeats its bias through later generations.

## Why the sizes fit

Pythagoras' theorem says that the two smaller squares' areas add up to their parent's area. For parent side length $s$ and triangle angle $\theta$, their side lengths are:

$$
s_1 = s\cos\theta, \qquad s_2 = s\sin\theta
$$

At 45 degrees, both children have side length $s/\sqrt{2}$. As branches grow deeper, squares can overlap. Adding the individual squares' areas therefore does not measure the area covered by the whole tree.

The [fractal canopy](/fractal-canopy) makes forks from line segments. The [T-square fractal](/t-square-fractal) places smaller squares at four corners instead of using triangles.
