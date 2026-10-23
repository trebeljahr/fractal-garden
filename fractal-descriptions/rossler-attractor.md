# Rössler Attractor

Follow the spiral as it spreads outward, rises and folds back toward its center. The trail records successive positions of one moving point. A view from above hides much of its height.

## Follow a short trajectory

The x–y projection shows the spiral from above. The x–z projection shows its excursions in height. Both contain the same numerical positions.

<figure data-lesson="rossler"></figure>

A second trajectory starts with a small change in x. Its separation can grow and shrink. The displayed distance includes the hidden coordinate.

The point follows three coupled equations:

$$
\frac{dx}{dt} = -y - z, \qquad
\frac{dy}{dt} = x + a y, \qquad
\frac{dz}{dt} = b + z (x - c)
$$

The defaults are $a = 0.2$, $b = 0.2$ and $c = 5.7$. The product $z(x-c)$ couples height to the x-coordinate. Its effect changes as the point moves. The repeated spiral and fold come from following the whole system.

## The fold depends on all three variables

The spiral spreads through the x–y plane before the height term changes its route. Looking from above can conceal that fold.

Changing c changes how x and z interact in the term $z(x-c)$. A finite trace cannot prove whether the eventual orbit closes.

The renderer uses fourth-order Runge–Kutta integration. **Time step** controls the numerical interval, while **Steps** controls the number of intervals. To compare two approximations over the same duration, reduce **Time step** and increase **Steps** together.

The [Lorenz attractor](/lorenz-attractor) carries a trajectory between two wings. The [logistic map](/logistic-map) shows a related progression of changing long-term behavior with a single recurrence.

## A spiral shadow hides the fold

In the x–y projection, the spiral dominates because the height coordinate disappears. The x–z projection reveals excursions that overlap in the view from above. Both are shadows of the same 3D trajectory.

A crossing of projected trails does not establish that the moving point returns to the same full state. The hidden coordinate can differ. The [Lorenz explanation](/lorenz-attractor) also distinguishes projected trajectories from Poincaré sections, which record crossings of a plane.
