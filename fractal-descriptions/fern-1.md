# Fern 1

This branching preset starts with X and uses two rules:

```
X → F+[[X]-X]-F[-FX]+X
F → FF
```

F draws forward. X draws nothing: it marks a place that grows during the next rewrite. The preset uses a turn angle of −25 degrees. The bracketed method comes from L-system plant modeling, where a saved turtle state lets several branches leave the same junction.<sup><a id="fern-1-ref-1" href="#fern-1-source-1">1</a></sup>

<figure data-investigation="fern-1"></figure>

Read `[[X]-X]` from the inside outward. Each opening bracket saves position and heading. Each closing bracket restores them without drawing a return stroke. The inner pair shares a starting point, while the outer pair restores the direction used before that whole group.

Each X produces four new X symbols and three F symbols. Existing F symbols double. Starting from X, the number of forward strokes after $n$ rewrites is

$$
f_n=\frac{3}{2}(4^n-2^n).
$$

For example, the first three stages contain 3, 18 and 84 strokes. That count follows from $f_{n+1}=2f_n+3\cdot4^n$. The repeated branch pattern supplies the fern-like outline. [Fern 4](/l-system/fern-4) changes the number and placement of the growing tips.

## Sources and notes

1. <span id="fern-1-source-1"></span> Przemysław Prusinkiewicz and Aristid Lindenmayer, [The Algorithmic Beauty of Plants, chapter 1](https://algorithmicbotany.org/papers/abop/abop-ch1.lowquality.pdf), Springer-Verlag, 1990. Section 1.6 explains bracketed branching, including saved position and orientation. The recurrence is derived directly from this preset’s productions. [Back](#fern-1-ref-1)
