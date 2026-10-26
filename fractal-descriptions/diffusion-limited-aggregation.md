# Diffusion-Limited Aggregation

Start with one fixed particle. Add another nearby and move it randomly. When it touches the fixed particle, it stays there. Add another moving particle and repeat.

The fixed particles form a cluster. New particles usually hit an exposed tip before reaching a deep gap. As a result, tips collect more particles and extend farther than the recessed parts.<sup><a id="diffusion-limited-aggregation-ref-1" href="#diffusion-limited-aggregation-source-1">1</a></sup>

<figure data-lesson="dla"></figure>

The diagram shows the individual moves. Each step goes up, down, left or right. A particle counts as touching if it reaches any of the eight neighboring cells, including a diagonal neighbor.

In this diagram the particle sticks on its first contact. In the full explorer, **Sticking chance** can be lower. A particle may then move again after touching the cluster.

The next experiment holds a fork still and counts first contacts. Then let those contacts become new particles and watch the branches extend.

<figure data-lesson="dla-contacts"></figure>

A point seed lets the cluster extend in all directions. A line seed gives it an extended base. Coloring by arrival time shows which parts formed first and where particles are attaching now.

## Further reading

- [Diffusion-limited aggregation — Wikipedia](https://en.wikipedia.org/wiki/Diffusion-limited_aggregation)
- [Diffusion-Limited Aggregation — The Coding Train](https://thecodingtrain.com/challenges/34-diffusion-limited-aggregation)

## Sources and notes

1. <span id="diffusion-limited-aggregation-source-1"></span> [Diffusion-limited aggregation: a kinetic critical phenomenon?](https://www.thp.uni-koeln.de/krug/teaching-Dateien/SS2012/Sander2000.pdf) [Back](#diffusion-limited-aggregation-ref-1)
