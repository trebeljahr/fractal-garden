# Fern 4

Watch the tip of this fern. It bends after growing its side branches. That last turn changes where the next part of the stem goes.

Start with X and use these rules at 20 degrees:

```text
X → F[+X]F[-X]+X
F → FF
```

F draws forward. X marks a growing tip. Brackets save the position and direction, then bring you back without drawing.<sup><a id="fern-4-ref-1" href="#fern-4-source-1">1</a></sup>

<figure data-construction-player="fern-4"></figure>

The first X branch turns one way. The second turns the other way. Both return to the stem. The final `+X` is outside brackets, so its turn stays with the continuing tip.

Each X makes three new tips. Each old F doubles. The first three rounds draw 2, 10 and 38 steps.

Move the final plus inside the previous brackets in the [L-system explorer](/l-system/explorer). The step count stays the same, but the tip loses its bend. One symbol can change a plant's outline.

[Fern 1](/l-system/fern-1) grows four tips at each replacement instead of three.

## Sources and notes

1. <span id="fern-4-source-1"></span> Przemysław Prusinkiewicz and Aristid Lindenmayer, [The Algorithmic Beauty of Plants, chapter 1](https://algorithmicbotany.org/papers/abop/abop-ch1.lowquality.pdf), Springer-Verlag, 1990. Section 1.6 explains saved turtle states. The tip counts and bracket edit follow directly from this preset. [Back](#fern-4-ref-1)
