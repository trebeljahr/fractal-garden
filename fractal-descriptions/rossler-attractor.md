# Rössler Attractor

Follow the spiral as it spreads outward, rises and folds back toward its center. The trail records successive positions of one moving point. A view from above hides much of its height.

## Follow a short trajectory

Step forward through the small diagram. The **x–y projection** shows the spiral from above. Switch to **x–z projection** to see its height. Both views show the same numerical positions.

<figure data-lesson="rossler"></figure>

Turn on **Compare a nearby start** to follow a second trajectory with a small change to its initial x-coordinate. The two paths share one scale. Their separation can grow and shrink over time, so the displayed distance uses all three coordinates.

The point follows three coupled equations:

$$
\frac{dx}{dt} = -y - z, \qquad
\frac{dy}{dt} = x + a y, \qquad
\frac{dz}{dt} = b + z (x - c)
$$

The defaults are $a = 0.2$, $b = 0.2$ and $c = 5.7$. The product $z(x-c)$ couples height to the x-coordinate. Its effect changes as the point moves. The repeated spiral and fold come from following the whole system.

## Change the motion in the explorer

Open **Fractal Studio Controls** and turn off **Auto rotate** to compare shapes from one camera angle. Turn off **Animate trail** to see the computed path together. Drag to rotate and use the scroll wheel to move closer.

Compare **c** near 2.3 with its default 5.7. Watch how the loops and folds change. A finite trail cannot establish whether an orbit eventually closes or remains irregular forever.

The renderer uses fourth-order Runge–Kutta integration. **Time step** controls the numerical interval, while **Steps** controls the number of intervals. To compare two approximations over the same duration, reduce **Time step** and increase **Steps** together.

The [Lorenz attractor](/lorenz-attractor) carries a trajectory between two wings. The [logistic map](/logistic-map) shows a related progression of changing long-term behavior with a single recurrence.
