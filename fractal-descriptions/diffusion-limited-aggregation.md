# Diffusion-Limited Aggregation

Start with one fixed particle. Add another nearby and move it randomly. When it touches the fixed particle, it stays there. Add another moving particle and repeat.

The fixed particles form a cluster. New particles usually hit an exposed tip before reaching a deep gap. As a result, tips collect more particles and extend farther than the recessed parts.<sup><a id="diffusion-limited-aggregation-ref-1" href="#diffusion-limited-aggregation-source-1">1</a></sup>

<figure data-lesson="dla"></figure>

The diagram shows the individual moves. Each step goes up, down, left or right. A particle counts as touching if it reaches any of the eight neighboring cells, including a diagonal neighbor.

In this diagram the particle sticks on its first contact. In the full explorer, **Sticking chance** can be lower. A particle may then move again after touching the cluster.

A point seed lets the cluster extend in all directions. A line seed gives it an extended base. Coloring by arrival time shows which parts formed first and where particles are attaching now.

Witten and Sander introduced the model in 1981. It was inspired by iron aggregates, although Witten later found that those particles joined through a different process.<sup><a id="diffusion-limited-aggregation-ref-2" href="#diffusion-limited-aggregation-source-2">2</a></sup> This is a model of random motion and sticking, rather than a rule for every branching structure in nature.

## Sources and notes

1. <span id="diffusion-limited-aggregation-source-1"></span> T. A. Witten Jr. and L. M. Sander, [Diffusion-Limited Aggregation, a Kinetic Critical Phenomenon](https://doi.org/10.1103/PhysRevLett.47.1400), *Physical Review Letters* 47 (1981), 1400–1403. Original random-walk construction and shielding explanation. [Back](#diffusion-limited-aggregation-ref-1)
2. <span id="diffusion-limited-aggregation-source-2"></span> Thomas A. Witten Jr., [Fractal Growth: A Continuing Mystery](https://garfield.library.upenn.edu/classics1993/A1993KX31200001.pdf), *Current Contents* 18, 3 May 1993. Creator's retrospective reports dimension near 1.7 and explains why the motivating iron aggregates required a different model. [Back](#diffusion-limited-aggregation-ref-2)
