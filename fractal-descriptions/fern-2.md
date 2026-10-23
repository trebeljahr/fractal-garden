# Fern 2

Two symbols divide the growth in this local preset. Start with Y and apply:

```
Y → YFX[+Y][-Y]
X → X[-FFF][+FFF]FX
```

F draws a stroke. X and Y only expand. The angle is 25.7 degrees. Square brackets save and restore a branch's position and heading, following the standard bracketed L-system method.<sup><a id="fern-2-ref-1" href="#fern-2-source-1">1</a></sup>

<figure data-construction-player="fern-2"></figure>

Each Y keeps one continuing Y and adds two side Y branches. It also inserts one F and one X. Each X makes two X symbols and seven F strokes, including two three-stroke side branches.

Existing F symbols have no replacement rule, so they remain single strokes in the next word. This differs from [Fern 1](/l-system/fern-1), where every old F doubles.

Let $x_n,y_n,f_n$ count the three symbols after $n$ rewrites. Their recurrences are $y_{n+1}=3y_n$, $x_{n+1}=2x_n+y_n$, and $f_{n+1}=f_n+7x_n+y_n$. Starting from Y gives forward counts 0, 1, 11 and 55. The growing symbols create all the new length.

## Sources and notes

1. <span id="fern-2-source-1"></span> Przemysław Prusinkiewicz and Aristid Lindenmayer, [The Algorithmic Beauty of Plants, chapter 1](https://algorithmicbotany.org/papers/abop/abop-ch1.lowquality.pdf), Springer-Verlag, 1990. Section 1.6 explains the bracketed turtle method. Symbol counts and the distinction between expanding tips and unchanged F strokes follow from the local rules. [Back](#fern-2-ref-1)
