# Gosper Island

Start with a hexagon. Replace each side with three shorter lines in a zigzag: turn 60 degrees one way, then 60 degrees back. Each line is $1/\sqrt{7}$ of the side, about 38%. Repeat on every line.<sup><a id="gosper-island-ref-1" href="#gosper-island-source-1">1</a></sup>

<figure data-construction-player="gosper-island"></figure>

The coast gets longer every round. Three lines of 38% make about 1.13 times the old length, so the coastline grows without limit.

The area does not change at all. The zigzag looks the same if you spin it half a turn about its middle, so it adds exactly as much on one side of the old line as it removes on the other. Every island has the area of the hexagon it started from.<sup><a id="gosper-island-ref-2" href="#gosper-island-source-2">2</a></sup>

That same half-turn is why islands fit together. Two neighboring hexagons share a side, and they read it in opposite directions. Because the zigzag looks the same from both ends, both islands get the identical coastline along that side. A grid of hexagons becomes a grid of islands, with no gaps or overlaps.<sup><a id="gosper-island-ref-3" href="#gosper-island-source-3">3</a></sup>

Now put six hexagons around one. The outer edge of those seven has 18 sides, and it is exactly a larger hexagon with each of its six sides zigzagged once.

<figure data-lesson="gosper-island"></figure>

Raise the round. The outline stays right on the seven islands, because zigzagging every line keeps a match a match. So seven islands make one island, $\sqrt{7}$ times as wide and seven times the area.

This is why the [Gosper curve](/l-system/gosper-curve) fills this shape: its route also joins seven smaller copies of itself. Set **Show** to **Whole plane** in **Exploration controls** to see the seven tints repeat.

## Further exploring

- [Gosper Island — MathWorld](https://mathworld.wolfram.com/GosperIsland.html)
- [Gosper curve — Wikipedia](https://en.wikipedia.org/wiki/Gosper_curve)

## Sources and notes

1. <span id="gosper-island-source-1"></span> [Flowsnake](https://larryriddle.agnesscott.org/ifs/ksnow/flowsnake.htm). The coastline's dimension, $2\ln 3/\ln 7$, comes from these numbers: [A113211](https://oeis.org/A113211). [Back](#gosper-island-ref-1)
2. <span id="gosper-island-source-2"></span> Calculation. This page's islands were also measured up to five rounds. The area matched the hexagon's to nine decimal places. [Back](#gosper-island-ref-2)
3. <span id="gosper-island-source-3"></span> [Flowsnake Earth](https://archive.bridgesmathart.org/2017/bridges2017-237.html). [Back](#gosper-island-ref-3)
