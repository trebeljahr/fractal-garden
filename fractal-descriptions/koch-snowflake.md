# Koch Snowflake

Start with a triangle. Divide each side into thirds. Replace the middle third with two sides of a little triangle pointing outward. You now have a triangular bump where there was a straight line.

Every line, including the sides of the bumps, gets the same treatment on the next round.

<figure data-construction-player="koch"></figure>

Four lines replace one. Each is one third as long, so their combined length is four thirds of the old length. The edge gets a third longer every round.

Straighten the pieces below to compare them with the original edge. Then try another round. The ruler stays the same size.

<figure data-lesson="koch-measurement"></figure>

Each new triangle has one ninth of the area of a triangle added in the previous round. There are four times as many of them on each round after the first. The total area added that round is only four ninths of the previous addition.<sup><a id="koch-snowflake-ref-1" href="#koch-snowflake-source-1">1</a></sup>

That is how the edge can grow forever while the enclosed area stays finite. Add all the new triangles and the final snowflake has 60% more area than the starting triangle.

Its drawing rule is `F → F-F++F-F`. F draws forward and each turn is 60 degrees. Replacing every F puts a smaller copy of the bump into every line.

The [anti-snowflake](/l-system/koch-anti-snowflake) places those bumps inward. The edge grows at the same rate while the enclosed area shrinks.

## Further reading

- [Koch snowflake — Wikipedia](https://en.wikipedia.org/wiki/Koch_snowflake)
- [Koch Snowflake — Math Fun Facts](https://math.hmc.edu/funfacts/koch-snowflake/)

## Sources and notes

1. <span id="koch-snowflake-source-1"></span> [Koch Snowflake](https://math.hmc.edu/funfacts/koch-snowflake/). [Back](#koch-snowflake-ref-1)
