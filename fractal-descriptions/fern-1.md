# Fern 1

A fern needs branches that leave a stem without pulling the rest of the stem sideways. Saving a position and direction makes that possible.

## Branches inside branches

The main growth symbol follows `X → F+[[X]-X]-F[-FX]+X`. Each existing F doubles. X marks a future growing tip and draws no stroke by itself.

<figure data-investigation="fern-1"></figure>

The nested brackets create two levels of branching. A closing bracket restores both position and direction, so the next instruction can grow another branch from the same junction.

The pattern models a branching structure, rather than the cells or biology of a real fern. [The Algorithmic Beauty of Plants](https://algorithmicbotany.org/papers/abop/abop-ch1.pdf) develops this connection. [Fern 4](/l-system/fern-4) uses fewer nested branches and bends its continuing tip.
