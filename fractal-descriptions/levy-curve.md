# Lévy Curve

Replace a straight line by two sides of a right triangle. Repeating this fold makes the Lévy C curve, with smaller curls nested inside its two large arms.

## More length between fixed endpoints

Each replacement keeps the old endpoints and uses two perpendicular segments. Both have length $1/\sqrt{2}$ of the old chord.

<figure data-investigation="levy-curve"></figure>

After $n$ replacements there are $2^n$ segments. Their total length is $(\sqrt{2})^n$ times the original length.

The two halves are rotated, reduced copies of the whole curve. They overlap in the limiting region, which makes the self-similarity harder to see in a dense image. The [Dragon curve](/l-system/dragon-curve) folds two copies with a different orientation.
