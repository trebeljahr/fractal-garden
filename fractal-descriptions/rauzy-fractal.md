# Rauzy Fractal

Turn a string of numbers into a walk. Then look at the walk from a direction that hides its forward motion. A compact shape appears.

Start with `1` and replace the digits:

```text
1 → 12
2 → 13
3 → 1
```

The strings begin `1`, `12`, `1213`, `1213121`. Their lengths are 1, 2, 4, 7, 13. After the first three, each length adds the previous three.

<figure data-investigation="rauzy"></figure>

## Three directions make a flat tile

Read each `1` as a step along x. A `2` steps along y. A `3` steps along z. The string becomes a staircase in three-dimensional space.

The staircase moves roughly along one overall direction. Project along that direction onto a plane. Although the staircase keeps going, its projected corners stay in a bounded patch. Include all the points they approach, and you get the Rauzy tile.<sup><a id="rauzy-fractal-ref-1" href="#rauzy-fractal-source-1">1</a></sup>

The colors group corners by the next digit in the walk. Those groups become three smaller pieces of the tile. Each uses a different shrink ratio.

Copies of the finished tile can cover the plane without gaps. Gérard Rauzy introduced the connection between this shape and its number sequence in 1982.<sup><a id="rauzy-fractal-ref-2" href="#rauzy-fractal-source-2">2</a></sup>

The [Fibonacci word fractal](/l-system/fibonacci-word-fractal) also draws from a replacement string. It uses two digits and turns on a flat plane instead of projecting a three-directional walk.

## Sources and notes

1. <span id="rauzy-fractal-source-1"></span> Valérie Berthé, [Discrete Geometry and Symbolic Dynamics](https://www.irif.fr/~berthe/Articles/KF_Revised.pdf), researcher survey, section 6.1. Defines the projected staircase, next-letter pieces, compact tile and positive area. [Back](#rauzy-fractal-ref-1)
2. <span id="rauzy-fractal-source-2"></span> Gérard Rauzy, [Nombres algébriques et substitutions](https://www.numdam.org/item/BSMF_1982__110__147_0/), *Bulletin de la Société Mathématique de France* 110 (1982), 147–178. See also Ali Messaoudi, [Propriétés arithmétiques et dynamiques du fractal de Rauzy](https://www.numdam.org/item/JTNB_1998__10_1_135_0.pdf), *Journal de Théorie des Nombres de Bordeaux* 10 (1998), 135–162, for planar tiling and the torus correspondence. [Back](#rauzy-fractal-ref-2)
