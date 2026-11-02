# Diffusion-Limited Aggregation

Place one particle and keep it still. Release a second particle nearby. Move it randomly until it touches the first, then leave it there too.

In the diagram, each move goes one square up, down, left or right. A touch along an edge or at a corner makes the particle stick. Follow a few walks to see which particles reach the fixed square.

<figure data-lesson="dla"></figure>

Keep releasing particles and they form a cluster. Why does it grow branches instead of filling the gaps between them?

The next experiment starts with a fork. Count where particles first touch it, without adding them to the fork. Compare the exposed tips with the gap between the branches.

<figure data-lesson="dla-contacts"></figure>

A particle heading into the gap may hit an outer branch first. It sticks there and never reaches the inside. Exposed tips collect more particles, extend farther, and block still more arrivals.<sup><a id="diffusion-limited-aggregation-ref-1" href="#diffusion-limited-aggregation-source-1">1</a></sup>

Choose **Let it grow** to see this happen. Each new particle becomes another place for the next one to stick.

In the full explorer, lower **Sticking chance** to let some particles move on after touching the cluster. Try a line seed to grow from a base instead of a single point. Color by arrival time to see which parts formed first.

## Further reading

- [Diffusion-limited aggregation — Wikipedia](https://en.wikipedia.org/wiki/Diffusion-limited_aggregation)
- [Diffusion-limited aggregation — MathWorld](https://mathworld.wolfram.com/Diffusion-LimitedAggregation.html)
- [Diffusion-Limited Aggregation — The Coding Train](https://thecodingtrain.com/challenges/34-diffusion-limited-aggregation)
- [DLA — Paul Bourke](https://paulbourke.net/fractals/dla/)

## Sources and notes

1. <span id="diffusion-limited-aggregation-source-1"></span> [Diffusion-limited aggregation: a kinetic critical phenomenon?](https://www.thp.uni-koeln.de/krug/teaching-Dateien/SS2012/Sander2000.pdf) [Back](#diffusion-limited-aggregation-ref-1)
