# Diffusion-Limited Aggregation

Watch new particles collect on the tips of a growing cluster. Branches extend into open space while narrow gaps receive fewer arrivals. Diffusion-limited aggregation, or DLA, builds this pattern from moving particles that stick to frozen ones.

## Follow one particle

Start with a frozen seed. A walker chooses a direction, moves, and checks whether it touches the cluster. In this grid model, each short move goes up, down, left or right. Contact includes all eight neighboring cells, so a diagonal touch counts too.

<figure data-lesson="dla"></figure>

The three paths have different outcomes: edge contact, diagonal contact, and departure from the window. Their random steps do not point toward the cluster.

The small diagram uses sticking chance 1. The first contact freezes the walker. Adding more walkers repeats the same local rule around the enlarged cluster.

## A seed changes the early growth

A point seed grows outward in all directions. A line seed gives walkers an extended base, so early branches compete along that line.

A particle that does not stick can continue walking. This lets it reach places beyond its first contact, changing how material arrives at the cluster.

**First arrivals** and **Last arrivals** set the colors for the oldest and newest frozen particles. The gradient shows their relative arrival order. **Particle budget** limits the cluster's size, while **Walkers per frame** changes how much work the animation attempts per frame.

## Why the gaps stay open

An approaching walker can reach an exposed tip before it reaches a sheltered gap. As the tips gain particles, they intercept more walkers. This local growth can produce branching patterns without repeating an exact geometric copy of the whole cluster.

The full explorer starts walkers near the growing cluster, discards distant walkers, and uses longer jumps far from contact. Those shortcuts keep it responsive. The inline diagram uses unit moves inside a fixed window so each decision stays visible.

The [Barnsley fern](/barnsley-fern) also chooses moves at random, but applies fixed transformations to a point. The [fractal canopy](/fractal-canopy) uses explicit branching geometry. The [Buddhabrot](/buddhabrot) builds a picture from many sampled orbits.
