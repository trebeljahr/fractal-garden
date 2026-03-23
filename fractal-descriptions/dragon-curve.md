# Dragon Curve

The Dragon Curve, often called the Heighway Dragon, is one of the most recognizable [L-system](https://en.wikipedia.org/wiki/L-system) fractals. It starts from a single segment and repeatedly folds that path by turning left and right according to a tiny replacement rule. After enough iterations, the path curls into a dense ribbon of self-similar detail.

This fractal uses a simple two-symbol L-system, the replacement rules look like this:

```ts
const dragonCurve = {
  axiom: "F",
  replace: {
    F: "F+G",
    G: "F-G",
  },
  angle: 90,
};
```

Both `F` and `G` mean “draw forward one step”, while `+` and `-` , mean rotate by 90 degrees clockwise and counter-clockwise respectively. The interesting part is that the sequence keeps changing with each iteration, so the path folds over itself in a very particular way.

Unlike some of the other L-systems in the Fractal Garden, the Dragon Curve keeps changing its overall orientation while it grows.

The Dragon Curve is closely related to paper-folding sequences, recursive turning rules, and other path-based fractals like the [Lévy Curve](/l-system/levy-curve) and the [Hilbert Curve](/l-system/hilbert-curve).
