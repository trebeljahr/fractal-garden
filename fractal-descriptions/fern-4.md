# Fern 4

Start with X and use these replacements at 20 degrees:

```text
X → F[+X]F[-X]+X
F → FF
```

F draws a line, and X marks where instructions will be added on the next round. So each X adds three new X positions and two F steps, and each old F doubles.

<figure data-construction-player="fern-4"></figure>

`[+X]` makes a side branch with a turn in one direction, and closing the bracket restores the previous position and direction. `[-X]` then makes a side branch in the other direction and restores them again.<sup><a id="fern-4-ref-1" href="#fern-4-source-1">1</a></sup>

The final `+X` has no brackets around it, so nothing restores its turn. It changes the direction used by the continuing stem, which the turns on the two side branches can't do.

Press **Plus inside** in the figure. It moves the final plus into the bracket before it, giving `F[+X]F[-X+]X`. The turn now comes just before the bracket closes, so it is undone before anything draws and the main stem continues straight. With **Plus outside**, each round turns the top of the stem another 20 degrees.

## Further exploring

- [L-system explorer](/l-system/explorer), for trying other replacement rules

### Videos

- [L Systems: Creating Plants from Simple Rules — Computerphile](https://www.youtube.com/watch?v=puwhf-404Xc)
- [L-System Fractal Trees — The Coding Train](https://www.youtube.com/watch?v=E1B4UoSQMFw)

### Reading

- [L-System User Notes — Paul Bourke](https://paulbourke.net/fractals/lsys/)

## Sources and notes

1. <span id="fern-4-source-1"></span> Przemysław Prusinkiewicz and Aristid Lindenmayer, [The Algorithmic Beauty of Plants, chapter 1](https://algorithmicbotany.org/papers/abop/abop-ch1.lowquality.pdf), Springer-Verlag, 1990. Section 1.6 explains saved turtle states. [Back](#fern-4-ref-1)
