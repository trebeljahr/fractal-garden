# Sierpinski Triangle

The Sierpinski Triangle is one of the coolest fractals in this garden. The reason why I like it so much is that there are so so many different ways to construct it. You can recursively cut out an inverted triangle, similar to how you would cut out squares from the [Sierpinski Carpet](/sierpinski-carpet). You could build one out of playing a Chaos Game (the triangle attracts points to it, just like the Barnsley Fern does). You could get it from a [Sierpinski-Arrowhead curve](/sierpinski-arrowhead).

You could start with a single triangle and shrink it, copy the shrunken version 3 times and stack them. Two at the bottom, 1 at the top in the middle. You could do the same with squares. Or any other shape! Just to show the point Michael Barnsley even created one made out of fishes - you can find an illustration of this on [page 3 of this paper](https://arxiv.org/pdf/math/0312314.pdf). 

You could draw it with its outlines only (like we do here), you could get it from a [Fractal Canopy](/fractal-canopy). You could even construct it with [Cellular Automata](https://en.wikipedia.org/wiki/Rule_90)! It's simply nuts.

To me, the most beautiful connection is that between the Sierpinski Triangle and the Towers of Hanoi Puzzle. There's a [great 3Blue1Brown video on that](https://www.youtube.com/watch?v=2SUvWfNJSsM).

Just like the Sierpinski Carpet, the Sierpinski Triangle has 0 surface area. It's effectively empty.

What you see here is an [L-System Implementation](https://en.wikipedia.org/wiki/L-system), which is generated by the L-System Algorithm with the following settings: 

```ts
const sierpinskiTriangle: Ruleset = {
    color: "#fc366b",
    minIterations: 1,
    maxIterations: 10,
    axiom: "F-G-G",
    replace: {
        F: "F-G+F+G-F",
        G: "GG",
    },
    angle: 120,
    initLength: (sizes) => Math.min(sizes.width, sizes.height),
    initTranslation: (sizes, initialLength) => {
        const totalHeight = (initialLength * Math.sqrt(3)) / 2;
        return [
        sizes.width / 2 - initialLength / 2,
        sizes.height - (sizes.height - totalHeight) / 2,
        ];
    },
    initRotation: (ctx) => ctx.rotate(radians(90)),
    divideFactor: 2,
};
```

This fractal, by its nature as an L-System, is *also* related to all the other L-System Fractals. A few you can check out: [Sierpinski Curve](/l-system/sierpinski-curve), [Fern 1](/l-system/fern-1), and the [Lévy Curve](/l-system/levy-curve).

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