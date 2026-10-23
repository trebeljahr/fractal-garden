# Diffusion-Limited Aggregation

Put one frozen dot on a grid. Release another dot nearby and let it wander. When it touches the frozen dot, it sticks. Send in another. Keep going.

Branches appear without any instruction to draw a branch. Exposed tips catch wandering dots first. The gaps behind those tips are harder to reach, so they grow more slowly.

Thomas Witten and Leonard Sander introduced this model in 1981.<sup><a id="diffusion-limited-aggregation-ref-1" href="#diffusion-limited-aggregation-source-1">1</a></sup>

<figure data-lesson="dla"></figure>

In the small diagram, a dot steps up, down, left or right. Touching a corner counts too. Each dot freezes at its first contact.

## Let some dots keep walking

Lower **Sticking chance** and a dot can touch the cluster without stopping. It gets more chances to move before it sticks.

A **point** seed grows outward from one spot. A **line** seed lets branches grow along a base. **First arrivals** and **Last arrivals** color the dots by when they joined.

Large clusters from the usual two-dimensional model have an estimated fractal dimension near 1.7. That is a measured result, not an exact rule for every cluster.<sup><a id="diffusion-limited-aggregation-ref-2" href="#diffusion-limited-aggregation-source-2">2</a></sup>

Witten later found that the iron particles which inspired the model joined in a different way. This rule did not describe those particular particles.<sup><a href="#diffusion-limited-aggregation-source-2">2</a></sup>

The [Barnsley fern](/barnsley-fern) also uses random choices. There, each choice moves a point into a smaller copy of a fixed shape. Here, each arriving dot changes where the next one can stick.

## Sources and notes

1. <span id="diffusion-limited-aggregation-source-1"></span> T. A. Witten Jr. and L. M. Sander, [Diffusion-Limited Aggregation, a Kinetic Critical Phenomenon](https://doi.org/10.1103/PhysRevLett.47.1400), *Physical Review Letters* 47 (1981), 1400–1403. Original random-walk construction and shielding explanation. [Back](#diffusion-limited-aggregation-ref-1)
2. <span id="diffusion-limited-aggregation-source-2"></span> Thomas A. Witten Jr., [Fractal Growth: A Continuing Mystery](https://garfield.library.upenn.edu/classics1993/A1993KX31200001.pdf), *Current Contents* 18, 3 May 1993. Creator's retrospective reports dimension near 1.7 and explains why the motivating iron aggregates required a different model. [Back](#diffusion-limited-aggregation-ref-2)
