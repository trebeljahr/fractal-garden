# Gosper Curve

The Gosper Curve, sometimes called the flowsnake, is a beautiful [L-system](https://en.wikipedia.org/wiki/L-system) curve built from 60 degree turns. Compared to the more square-looking [Hilbert Curve](/l-system/hilbert-curve) or the sharp folds of the [Lévy Curve](/l-system/levy-curve), the Gosper Curve feels much more organic and flowing.

Like the other L-system fractals in the garden, it begins from a short axiom and repeatedly rewrites that starting string according to a fixed replacement rule. For the Gosper Curve the common rule set looks like this:

```ts
const gosperCurve = {
  axiom: "XF",
  angle: 60,
  replace: {
    X: "X+YF++YF-FX--FXFX-YF+",
    Y: "-FX+YFYF++YF+FX--FX-Y",
  },
};
```

The letters `X` and `Y` only help with the rewriting process. The actual drawing happens on the `F` symbols, while `+` and `-` rotate by 60 degrees.

One of the nicest things about the Gosper Curve is that it sits somewhere between a curve and a tiling. With more and more iterations, it starts to suggest hexagonal structure and begins to fill space in a very distinctive way.

Because its overall shape changes quite a lot as it grows, this implementation first traces the full path, measures the bounds, and then scales the result to fit the screen before drawing it.
