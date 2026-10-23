# Fern 4

A turn outside a branch changes what grows after the branch returns. This local preset starts from X, turns by 20 degrees, and applies:

```
X → F[+X]F[-X]+X
F → FF
```

F draws forward. X marks future growth. Brackets save position and heading, then restore both at the closing bracket.<sup><a id="fern-4-ref-1" href="#fern-4-source-1">1</a></sup>

<figure data-investigation="fern-4"></figure>

The first two X symbols sit inside branches. Their turns affect their descendants, while the continuing stem resumes its saved direction. The final `+X` sits outside brackets. Its turn remains in the state inherited by the continuing tip.

Each X creates three X symbols and two F symbols. Old F symbols double. Consequently, $x_n=3^n$ and the forward-stroke count is

$$
f_n=2(3^n-2^n).
$$

The first three rewrites produce 2, 10 and 38 strokes. Move the final plus inside the preceding brackets and those counts stay unchanged, but the continuing tip loses its bend. Counting symbols therefore captures growth that the drawing's outline alone can hide. [Fern 1](/l-system/fern-1) uses four growing tips and an additional level of nested brackets.

## Sources and notes

1. <span id="fern-4-source-1"></span> Przemysław Prusinkiewicz and Aristid Lindenmayer, [The Algorithmic Beauty of Plants, chapter 1](https://algorithmicbotany.org/papers/abop/abop-ch1.lowquality.pdf), Springer-Verlag, 1990. Section 1.6 explains saved turtle states. The tip counts, recurrence and proposed bracket edit follow directly from this preset. [Back](#fern-4-ref-1)
