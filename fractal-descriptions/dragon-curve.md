# Dragon Curve

Follow the line through its right-angle bends. Small folds join into larger folds, producing a path with repeated shapes at different scales. The Dragon curve, also called the Heighway dragon, grows from two replacement rules.

## Rewrite, then draw

Start with **F**. Replace every **F** with **F+G** and every **G** with **F−G**. Apply both replacements to the old word at once. The new symbols wait until the next rewrite before they expand again.

<figure data-lesson="lsystem-dragon"></figure>

Both **F** and **G** draw one forward segment. This Dragon renderer turns counterclockwise for **+** and clockwise for **−**, using 90 degrees per turn. It starts with a 45-degree heading. The other L-system pages can use a different turn convention.

Move **Rewrites** to build a word. Then use **Next step** to follow its instructions. Amber marks the last symbol and the most recent segment. A turning symbol changes the arrow's direction while keeping it at the same point.

## Twice as many segments

Each forward symbol becomes two forward symbols. After $n$ rewrites, the word draws:

$$
N_n = 2^n
$$

The full explorer uses **Iterations** for this rewrite count. Turn off **Animate growth** in **Pattern Studio** to hold a stage still. The diagram includes the unexpanded starting segment at **Rewrites 0**; the full explorer starts at **Iterations 1**.

The renderer fits each finite path into the view. Compare the triangular turns of the [Lévy curve](/l-system/levy-curve) with the square-grid path of the [Hilbert curve](/l-system/hilbert-curve). The [L-system explorer](/l-system/explorer) lets you edit the replacement rules.
