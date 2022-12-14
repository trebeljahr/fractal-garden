# Sierpinski Curve

The Sierpinski Curve is a space-filling curve and is therefore related to the [Hilbert Curve](/l-system/hilbert-curve) and also the [Arrowhead Curve](/l-system/arrowhead-curve). What you see on this page is the "square" based variant of the Sierpinski curve. You can see how it is constructed recursively by adding the current shape, over and over to the four sides of itself.

It doesn't have the cool spacial closeness preserving properties of the Hilbert curve though. However, it's still a cool-looking 1-dimensional curve, wrapping itself around in a 2D space, completely covering every single point within the plane.

And it has use cases as well! It's connected to the Traveling Salesman problem and helps to solve it more quickly for certain sets of points. See Wikipedia on the [Sierpinski Curve](https://en.wikipedia.org/wiki/Sierpi%C5%84ski_curve) for more details.

This fractal is an [L-System Fractal](https://en.wikipedia.org/wiki/L-system). It is generated by the L-System Algorithm with the following settings: 

```ts
const sierpinskiCurve: Ruleset = {
    color: "#f7ad1c",
    minIterations: 1,
    maxIterations: 7,
    axiom: "F+XF+F+XF",
    replace: {
      X: "XF-F+F-XF+F+XF-F+F-X",
    },
    angle: 90,
    initLength: (sizes) => Math.min(sizes.width, sizes.height) * 0.25,
    initTranslation(sizes, initialLength) {
      return [sizes.width / 2 - initialLength * 1.6, sizes.height / 2];
    },
    divideFactor: 2.05,
};
```

This fractal, by its nature as an L-System, is related to all the other L-System Fractals. A few you can check out: [Hilbert Curve](/l-system/hilbert-curve), [Fern 4](/l-system/fern-4), and the [Lévy Curve](/l-system/levy-curve).

The alphabet to instructions set used to draw this fractal are the same as for the other L-Systems:

```ts
const drawRules: Record<string, () => void> = {
    V: () => {},
    W: () => {},
    X: () => {},
    Y: () => {},
    Z: () => {},
    G: drawForward,
    F: drawForward,
    f: () => ctx.translate(0, -len),
    "+": () => ctx.rotate(angle * rotationDirection),
    "-": () => ctx.rotate(angle * -rotationDirection),
    "|": () => ctx.rotate(180),
    "[": () => ctx.push(),
    "]": () => ctx.pop(),
    "#": () => (ctx.lineWidth = weight += weightIncrement) ,
    "!": () => (ctx.lineWidth = weight -= weightIncrement) ,
    ">": () => (len *= scale),
    "<": () => (len /= scale),
    "&": () => (rotationDirection = -rotationDirection),
    "(": () => (angle += angleIncrement),
    ")": () => (angle -= angleIncrement),
};
```