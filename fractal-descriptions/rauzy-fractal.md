# Rauzy Fractal

The Rauzy construction begins with a string. Start at `1` and replace every digit using:

```text
1 → 12
2 → 13
3 → 1
```

The first strings are `1`, `12`, `1213` and `1213121`. Each replacement uses the whole previous string.

<figure data-investigation="rauzy"></figure>

Read a `1` as a step along the x direction, a `2` along y and a `3` along z. This produces a staircase in three-dimensional space. Every digit adds one step and one new corner.

Look along the staircase, toward its far end. The steps now appear beside one another rather than stretching away into the distance. The diagram plots each corner as a dot in this end-on view. Those dots stay within a fixed area even as the staircase gets longer.<sup><a id="rauzy-fractal-ref-1" href="#rauzy-fractal-source-1">1</a></sup>

Longer strings add more dots and fill out the Rauzy tile. Each dot's color comes from the next digit in the string: one color for 1, another for 2, another for 3.

Copies of the finished tile fit together without gaps. You can slide them into place without turning them.<sup><a id="rauzy-fractal-ref-2" href="#rauzy-fractal-source-2">2</a></sup>

## Further reading

- [Rauzy fractal — Wikipedia](https://en.wikipedia.org/wiki/Rauzy_fractal)
- [Rauzy fractal — MathWorld](https://mathworld.wolfram.com/RauzyFractal.html)

## Sources and notes

1. <span id="rauzy-fractal-source-1"></span> Valérie Berthé, [Discrete Geometry and Symbolic Dynamics](https://www.irif.fr/~berthe/Articles/KF_Revised.pdf), researcher survey, section 6.1. Defines the projected staircase, next-letter pieces, compact tile and positive area. [Back](#rauzy-fractal-ref-1)
2. <span id="rauzy-fractal-source-2"></span> Gérard Rauzy, [Nombres algébriques et substitutions](https://www.numdam.org/item/BSMF_1982__110__147_0/), *Bulletin de la Société Mathématique de France* 110 (1982), 147–178. See also Ali Messaoudi, [Propriétés arithmétiques et dynamiques du fractal de Rauzy](https://www.numdam.org/item/JTNB_1998__10_1_135_0.pdf), *Journal de Théorie des Nombres de Bordeaux* 10 (1998), 135–162, for planar tiling and the torus correspondence. [Back](#rauzy-fractal-ref-2)
