# Fern 1

Draw a stem. Branch off it, then return to the fork and grow another branch. Repeat at the new tips. Smaller leaflets appear inside larger leaflets.

The instructions start with X and use these rules:

```text
X → F+[[X]-X]-F[-FX]+X
F → FF
```

F draws forward. X marks a tip that will grow next time. Plus and minus turn in opposite directions. This fern uses an angle of −25 degrees.

<figure data-construction-player="fern-1"></figure>

An opening bracket means “remember this spot and direction.” A closing bracket means “go back there without drawing.” That lets several branches start from the same fork.<sup><a id="fern-1-ref-1" href="#fern-1-source-1">1</a></sup>

Each X makes four new X tips. Each old F becomes two forward steps. The first three rounds draw 3, 18 and 84 steps. A tiny set of instructions soon makes a crowded plant.

[Fern 4](/l-system/fern-4) grows three tips each time and puts a turn at the continuing tip. Compare where the main stems bend.

## Sources and notes

1. <span id="fern-1-source-1"></span> Przemysław Prusinkiewicz and Aristid Lindenmayer, [The Algorithmic Beauty of Plants, chapter 1](https://algorithmicbotany.org/papers/abop/abop-ch1.lowquality.pdf), Springer-Verlag, 1990. Section 1.6 explains bracketed branching, including saved position and orientation. The step counts follow directly from this preset’s rules. [Back](#fern-1-ref-1)
