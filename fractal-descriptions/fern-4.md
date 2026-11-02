# Fern 4

This rule makes two side branches and a continuing stem. It also turns the continuing stem after the side branches are complete.

Start with X and use these replacements at 20 degrees:

```text
X → F[+X]F[-X]+X
F → FF
```

F draws a line. X marks where instructions will be added on the next round.

<figure data-construction-player="fern-4"></figure>

The first `[+X]` makes a side branch with a turn in one direction. Closing the bracket restores the previous position and direction. The second `[-X]` makes a side branch in the other direction and restores them again.<sup><a id="fern-4-ref-1" href="#fern-4-source-1">1</a></sup>

The final `+X` has no brackets around it. Its turn changes the direction used by the continuing stem. That is why its effect differs from the turns on the two side branches.

Each X adds three new X positions and two F steps. Each old F doubles. Try moving the final plus inside the previous bracket. The turn is now undone when the bracket closes. The main stem continues straight.

## Further reading
- [L-system explorer](/l-system/explorer), for trying other replacement rules

## Sources and notes

1. <span id="fern-4-source-1"></span> Przemysław Prusinkiewicz and Aristid Lindenmayer, [The Algorithmic Beauty of Plants, chapter 1](https://algorithmicbotany.org/papers/abop/abop-ch1.lowquality.pdf), Springer-Verlag, 1990. Section 1.6 explains saved turtle states. [Back](#fern-4-ref-1)
