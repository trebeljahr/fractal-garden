# Twindragon

The Twindragon, also called the Davis–Knuth dragon, is what you get when you take two copies of the [Dragon Curve](/l-system/dragon-curve) and place them back to back. The second dragon is the first one turned by 180° around the middle of its chord, so it runs from the end of the first dragon back to its start. The two halves fit together without crossing or sharing a single edge.

Each half is the same folding rule as the Heighway dragon:

```ts
const twindragonHalf = {
  axiom: "F",
  replace: {
    F: "F+G",
    G: "F-G",
  },
  angle: 90,
};
```

Here the two halves are drawn in different colors, so you can see where one dragon ends and the other begins.

The filled shape is a self-similar tile. It is made of two smaller copies of itself, each scaled by $\frac{1}{\sqrt{2}}$ and turned by 45°. In the complex plane it is the set of all numbers

$$
T = \left\{ \sum_{k=1}^{\infty} d_k \, (i-1)^{-k} \;:\; d_k \in \{0, 1\} \right\},
$$

which means it plays the role of the "unit digit square" for numbers written in base $i - 1$. Turn on `showTiling` to see one of its best properties: copies of the Twindragon, shifted along the chord $c$ and along $i \cdot c$, cover the whole plane with no gaps and no overlaps.

Because the tile has a real area, its Hausdorff dimension is exactly $2$. Its boundary is a fractal curve with dimension

$$
D = 2 \log_2 \lambda \approx 1.5236, \quad \lambda^3 - \lambda^2 - 2 = 0,
$$

which is the same as the boundary dimension of the Heighway dragon. Other path-based relatives in the garden are the [Terdragon](/l-system/terdragon) and the [Lévy Curve](/l-system/levy-curve).
