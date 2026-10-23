# L-System Explorer

An L-system starts with a word, called the axiom, and rules for replacing its symbols. Apply every rule to the old word simultaneously. The new letters wait for the next generation before they expand. Lindenmayer introduced this parallel rewriting framework in 1968 to describe biological development.<sup><a id="l-system-explorer-ref-1" href="#l-system-explorer-source-1">1</a></sup>

Rewriting creates a word. A separate interpretation turns that word into geometry. F can draw forward, plus and minus can turn, and other letters can mark future growth without drawing.

<figure data-investigation="l-system-explorer"></figure>

For example, start with X and use `X → F[+X]F[-X]+X`, with `F → FF`. The first rewrite contains three growing tips and two forward strokes. The second contains nine tips and ten strokes. Brackets restore the saved position and heading after each side branch.

The rules decide which branches connect. The angle decides how those branches sit in the plane. Changing the angle preserves that abstract branching structure, although new geometric intersections can appear. Moving a bracket changes which branch inherits a turn and can change the connections themselves.

The same language can describe very different constructions. The [Koch snowflake](/l-system/koch-snowflake) rewrites boundary edges. [Fern 1](/l-system/fern-1) restores branch junctions with a stack. A [3D Hilbert route](/l-system/hilbert-curve-3d) needs spatial orientation as well as position. The distinction between a symbol's replacement and its drawing action makes all three possible.

## Sources and notes

1. <span id="l-system-explorer-source-1"></span> Przemysław Prusinkiewicz and Aristid Lindenmayer, [The Algorithmic Beauty of Plants, chapter 1](https://algorithmicbotany.org/papers/abop/abop-ch1.lowquality.pdf), Springer-Verlag, 1990. Sections 1.1–1.3 explain parallel rewriting and turtle interpretation; sections 1.5–1.6 extend them to spatial and branching structures. Example counts are calculated from the stated productions. [Back](#l-system-explorer-ref-1)
