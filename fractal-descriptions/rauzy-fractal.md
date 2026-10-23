# Rauzy Fractal

Start with `1`. Replace every letter simultaneously using

$$
1\to12,\qquad2\to13,\qquad3\to1.
$$

The words begin `1`, `12`, `1213`, `1213121`, … Their lengths are $1,2,4,7,13,\ldots$. Each later length is the sum of the previous three.

<figure data-investigation="rauzy"></figure>

Read the infinite word as a staircase in three dimensions. Each `1` takes one step along x, each `2` along y, and each `3` along z. Record the corners. The substitution matrix is

$$
M=\begin{pmatrix}1&1&1\\1&0&0\\0&1&0\end{pmatrix}.
$$

Its expanding eigenvalue is the tribonacci constant $\beta\approx1.839286$, which solves $\beta^3=\beta^2+\beta+1$. The staircase follows its expanding direction on average. Project along that direction onto the contracting plane. The projected corners remain bounded, and their closure forms the tile.<sup><a id="rauzy-fractal-ref-1" href="#rauzy-fractal-source-1">1</a></sup>

The other eigenvalues are conjugates $\alpha,\overline\alpha$, with $|\alpha|=\beta^{-1/2}<1$. This explorer uses complex coordinates where a projected x-step equals $1$ and substitution acts as multiplication by $\alpha$.

Color each corner by its next letter. Call the three closed pieces $R_1,R_2,R_3$ and their union $R$. The substitution directly gives

$$
R_1=\alpha R,\qquad R_2=1+\alpha^2R,\qquad R_3=1+\alpha+\alpha^3R.
$$

Every substituted word starts with `1`. A `2` follows the first `1` in `12`, while a `3` follows it in `13`. These facts give the three equations. Their linear scale factors are $|\alpha|$, $|\alpha|^2$ and $|\alpha|^3$, rather than one common factor.

The tile has nonempty interior and dimension two. Translated copies tile the plane. Its symbolic dynamics also gives a geometric representation of translation on a two-dimensional torus, a connection Rauzy introduced in 1982.<sup><a id="rauzy-fractal-ref-2" href="#rauzy-fractal-source-2">2</a></sup>

The projection is generally oblique. Compare the [Fibonacci word](/l-system/fibonacci-word-fractal), or the higher-dimensional construction behind [Penrose tilings](/penrose-tiling).

## Sources and notes

1. <span id="rauzy-fractal-source-1"></span> Valérie Berthé, [Discrete Geometry and Symbolic Dynamics](https://www.irif.fr/~berthe/Articles/KF_Revised.pdf), researcher survey, section 6.1. Defines the projected staircase, next-letter pieces, compact tile and positive area. The displayed piece equations are derived from this substitution in the explorer's complex normalization. [Back](#rauzy-fractal-ref-1)
2. <span id="rauzy-fractal-source-2"></span> Gérard Rauzy, [Nombres algébriques et substitutions](https://www.numdam.org/item/BSMF_1982__110__147_0/), *Bulletin de la Société Mathématique de France* 110 (1982), 147–178. See also Ali Messaoudi, [Propriétés arithmétiques et dynamiques du fractal de Rauzy](https://www.numdam.org/item/JTNB_1998__10_1_135_0.pdf), *Journal de Théorie des Nombres de Bordeaux* 10 (1998), 135–162, for planar tiling and the torus correspondence. [Back](#rauzy-fractal-ref-2)
