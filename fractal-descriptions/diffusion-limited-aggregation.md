# Diffusion-Limited Aggregation

Place one particle and keep it still. Release a second particle nearby and move it randomly until it touches the first, then leave it there too.

In the diagram, the next-step button moves the amber particle one square up, down, left or right, at random, and a touch along an edge or at a corner makes it stick. Follow a few walks to see which particles reach the fixed square.

<figure data-lesson="dla"></figure>

Walk 3 leaves the picture before it touches anything. That particle adds nothing, so we release another and try again.

Keep releasing particles and they form a cluster. Why does it grow branches instead of filling the gaps between them?

The next experiment tests this on a fork. Press Play to release particles near the dotted border. They move and stick as before, except that each first touch leaves a mark and then the particle is removed, so the fork stays the same.<sup><a id="diffusion-limited-aggregation-ref-1" href="#diffusion-limited-aggregation-source-1">1</a></sup> Compare the exposed tips with the gap between the branches, and see where the most marks collect.

<figure data-lesson="dla-contacts"></figure>

A particle heading into the gap may hit an outer branch first, and then it sticks there and never reaches the inside. So exposed tips collect more particles, extend farther, and block still more arrivals.<sup><a id="diffusion-limited-aggregation-ref-2" href="#diffusion-limited-aggregation-source-2">2</a></sup>

Choose **Let it grow** and press Play. Each particle now stays where it first touches, so the next one can stick to it. Watch which branches extend.

In the full explorer, lower **Sticking chance** to let some particles move on after touching the cluster. Try a line seed to grow from a base instead of a single point. Color by arrival time to see which parts formed first.

## Further exploring

### Videos

- [Diffusion-Limited Aggregation — The Coding Train](https://www.youtube.com/watch?v=Cl_Gjj80gPE)

### Reading

- [Diffusion-limited aggregation — Wikipedia](https://en.wikipedia.org/wiki/Diffusion-limited_aggregation)
- [Diffusion-limited aggregation — MathWorld](https://mathworld.wolfram.com/Diffusion-LimitedAggregation.html)
- [DLA — Paul Bourke](https://paulbourke.net/fractals/dla/)

## Sources and notes

1. <span id="diffusion-limited-aggregation-source-1"></span> Diagram construction. Walks that leave the picture are discarded, as are starts already covered by growth. Each walk stops after at most 2,048 moves. [Back](#diffusion-limited-aggregation-ref-1)
2. <span id="diffusion-limited-aggregation-source-2"></span> [Diffusion-limited aggregation: a kinetic critical phenomenon?](https://www.thp.uni-koeln.de/krug/teaching-Dateien/SS2012/Sander2000.pdf) [Back](#diffusion-limited-aggregation-ref-2)
