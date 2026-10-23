# Diffusion-Limited Aggregation

Place a frozen seed on a grid. Release a particle some distance away. Let it walk randomly until it touches the cluster, then freeze it there. Repeat with another particle.

Thomas Witten and Leonard Sander introduced this model in 1981. Their original simulation released particles one at a time. Exposed ends grew faster because the cluster sheltered its inner perimeter from incoming walkers.<sup><a id="diffusion-limited-aggregation-ref-1" href="#diffusion-limited-aggregation-source-1">1</a></sup>

That screening explains the open branches. A walker must avoid many exposed sites before it can reach a deep gap. Tips intercept more walkers and extend farther. No particle needs instructions about the final shape.

<figure data-lesson="dla"></figure>

In this explorer, short steps move up, down, left or right. Contact includes all eight neighboring cells, so diagonal contact counts. The small diagram uses sticking chance one. A walker freezes on its first contact.

Reducing **Sticking chance** lets some contacting walkers continue. A point seed starts radial growth. A line seed starts branches along an extended base. The full simulation uses longer jumps away from contact and discards distant walkers. Those shortcuts approximate the walk while keeping growth responsive.

The usual two-dimensional DLA model has an empirically estimated fractal dimension near 1.7. That number describes how particle count grows with cluster radius. It is not an exact dimension proved for every finite cluster.<sup><a id="diffusion-limited-aggregation-ref-2" href="#diffusion-limited-aggregation-source-2">2</a></sup>

Witten later explained that DLA did not describe the iron aggregates that first inspired it. Those aggregates formed through a different aggregation process.<sup><a id="diffusion-limited-aggregation-ref-3" href="#diffusion-limited-aggregation-source-2">2</a></sup>

**First arrivals** and **Last arrivals** color particle age. Compare the [Barnsley fern](/barnsley-fern), where random choices select fixed transformations, or the [fractal canopy](/fractal-canopy), where geometry prescribes each branch.

## Sources and notes

1. <span id="diffusion-limited-aggregation-source-1"></span> T. A. Witten Jr. and L. M. Sander, [Diffusion-Limited Aggregation, a Kinetic Critical Phenomenon](https://doi.org/10.1103/PhysRevLett.47.1400), *Physical Review Letters* 47 (1981), 1400–1403. Original random-walk construction and shielding explanation. [Back](#diffusion-limited-aggregation-ref-1)
2. <span id="diffusion-limited-aggregation-source-2"></span> Thomas A. Witten Jr., [Fractal Growth: A Continuing Mystery](https://garfield.library.upenn.edu/classics1993/A1993KX31200001.pdf), *Current Contents* 18, 3 May 1993. Creator's retrospective reports dimension near 1.7 and explains why the motivating iron aggregates required a different model. [Back](#diffusion-limited-aggregation-ref-2) · [Back to history](#diffusion-limited-aggregation-ref-3)
