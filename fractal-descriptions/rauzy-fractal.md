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

The staircase extends approximately along one overall direction. Project its corners onto a plane, looking along that direction with parallel viewing lines. This removes the overall forward displacement. The remaining sideways positions stay within a bounded region.<sup><a id="rauzy-fractal-ref-1" href="#rauzy-fractal-source-1">1</a></sup>

Longer strings add more points to that region. Including their limit points gives the Rauzy tile. The colors separate the points by the next digit in the string, dividing the tile into three pieces.

Translated copies of this tile fit together to cover the plane.<sup><a id="rauzy-fractal-ref-2" href="#rauzy-fractal-source-2">2</a></sup> The [Fibonacci word fractal](/l-system/fibonacci-word-fractal) also uses a replacement string, but interprets its digits as turns in a flat drawing instead of projecting a three-dimensional staircase.

## Sources and notes

1. <span id="rauzy-fractal-source-1"></span> Valérie Berthé, [Discrete Geometry and Symbolic Dynamics](https://www.irif.fr/~berthe/Articles/KF_Revised.pdf), researcher survey, section 6.1. Defines the projected staircase, next-letter pieces, compact tile and positive area. [Back](#rauzy-fractal-ref-1)
2. <span id="rauzy-fractal-source-2"></span> Gérard Rauzy, [Nombres algébriques et substitutions](https://www.numdam.org/item/BSMF_1982__110__147_0/), *Bulletin de la Société Mathématique de France* 110 (1982), 147–178. See also Ali Messaoudi, [Propriétés arithmétiques et dynamiques du fractal de Rauzy](https://www.numdam.org/item/JTNB_1998__10_1_135_0.pdf), *Journal de Théorie des Nombres de Bordeaux* 10 (1998), 135–162, for planar tiling and the torus correspondence. [Back](#rauzy-fractal-ref-2)
