# Diffusion-Limited Aggregation

Diffusion-Limited Aggregation (DLA for short) is the odd one out in this garden. There is no formula you iterate and no rule you rewrite. There's just a sticky seed and a lot of drunk particles stumbling around until they bump into it.

The recipe is almost silly in how simple it is. Start with a single frozen particle in the middle of the screen. Release a new particle somewhere far away and let it do a [random walk](https://en.wikipedia.org/wiki/Random_walk): one step up, down, left or right, chosen completely at random, over and over again. The moment it touches the frozen cluster, it freezes too. Then release the next one. Repeat a few ten thousand times.

What grows out of that is not a blob, but a branching, coral-like tree. The reason is that the tips of the branches stick out the furthest, so a wandering particle is much more likely to hit a tip than to sneak all the way into one of the deep fjords between the branches. The tips grow, which makes them stick out even further, which makes them grow even faster. The inner parts get starved. It's the rich-get-richer effect, drawn in particles.

You can find this shape all over nature: in [electrodeposition](https://en.wikipedia.org/wiki/Electrochemical_deposition) of metals, in mineral dendrites on rocks, in frost on a window, in lightning and in the [Lichtenberg figures](https://en.wikipedia.org/wiki/Lichtenberg_figure) that form when high voltage burns through wood. It looks related to the branching of the [Fractal Canopy](/fractal-canopy) or the leaves of the [Barnsley Fern](/barnsley-fern), but those are perfectly ordered and self-similar. A DLA cluster is only self-similar *statistically*. Zoom into one branch and it doesn't look exactly like the whole thing, but it looks like it *could* have been the whole thing.

Like the [Buddhabrot](/buddhabrot), the picture is built from randomness, and no two runs ever give the same cluster. Yet they all have the same "feel" and the same fractal dimension. In two dimensions, the number of particles $N$ inside a radius $r$ grows like

$$
N(r) \propto r^{D}, \qquad D \approx 1.71
$$

So the cluster is more than a line ($D = 1$) but much less than a filled disc ($D = 2$). It's full of holes on every scale.

What you see here is a simulation on a grid of tiny cells. To keep it fast, a few tricks are used:

- New walkers are spawned on a circle just outside the current cluster, instead of far, far away.
- Walkers that wander off too far are simply removed, because they would take forever to come back.
- When a walker is far from the cluster, it takes one big random jump instead of hundreds of tiny steps, since nothing can happen to it out there anyway.
- Many walkers are simulated per animation frame, but the work is cut off after a few milliseconds so your browser stays responsive.

The **sticking chance** controls how likely a particle is to freeze when it touches the cluster. At 1, every touch sticks and you get thin, wispy branches. Lower it and particles get a few more chances to roll deeper into the gaps, which makes the cluster thicker and denser. The **line** seed starts from the whole bottom edge instead of a single point and grows a forest of competing trees, where the tallest ones shade out their neighbors. The colors show the arrival time: the first particles get the first color, the last ones the second, so you can see how the cluster grew from the inside out.
