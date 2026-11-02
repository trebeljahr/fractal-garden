# Fern 1

This fern is drawn from a string of instructions. F means move forward while drawing a line. X marks a position that will gain more instructions at the next step; it doesn't draw anything itself.

Starting with X, replace the letters using:

```text
X → F+[[X]-X]-F[-FX]+X
F → FF
```

Plus and minus turn in opposite directions. The angle setting is −25 degrees.

<figure data-construction-player="fern-1"></figure>

The brackets make branches possible. At an opening bracket, save the current position and direction. At its closing bracket, restore both without drawing a return line. The following instructions can then draw a different branch from the same position.<sup><a id="fern-1-ref-1" href="#fern-1-source-1">1</a></sup>

The brackets inside brackets repeat that process within a branch. Every X adds four new X positions. Each existing F becomes FF, so the earlier stems become longer strings of drawing steps too.

Change the angle to spread the branches apart or bring them closer together. The letter rules stay the same.

## Further reading
- [L-system plants — Wikipedia](https://en.wikipedia.org/wiki/L-system#Example_7:_fractal_plant)
- [L-system explorer](/l-system/explorer), for trying other replacement rules

## Sources and notes

1. <span id="fern-1-source-1"></span> Przemysław Prusinkiewicz and Aristid Lindenmayer, [The Algorithmic Beauty of Plants, chapter 1](https://algorithmicbotany.org/papers/abop/abop-ch1.lowquality.pdf), Springer-Verlag, 1990. Section 1.6 explains bracketed branching, including saved position and orientation. [Back](#fern-1-ref-1)
