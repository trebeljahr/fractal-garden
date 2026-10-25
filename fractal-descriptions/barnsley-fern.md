# Barnsley Fern

This fern is made one dot at a time. Each dot starts where the last one landed. One of four rules moves it to a new position, and the computer draws another dot there.

The rules shrink, turn and move coordinates. One sends a point onto the stem. One puts it into a smaller copy toward the fern's tip. The other two put it into copies on the left and right.<sup><a id="barnsley-fern-ref-1" href="#barnsley-fern-source-1">1</a></sup>

<figure data-article-images="fern"></figure>

The fern's outline comes from where those copies fit. The computer chooses a rule randomly, but every choice still lands inside one of the four copies. After enough moves, dots appear throughout the fern.

The Classic Barnsley preset uses the tip rule 85% of the time. The stem gets 1%, and the two side rules get 7% each.

<figure data-lesson="fern"></figure>

Choose **All four maps** to remove the random choice. Now every step applies all four rules to the whole previous picture. You see the smaller copies directly. Repeat that process and it approaches the same fern.<sup><a id="barnsley-fern-ref-2" href="#barnsley-fern-source-2">2</a></sup>

The two methods place dots differently along the way. Changing the positive probabilities changes how heavily the random method fills each region, but the four fixed rules still determine the same final shape.<sup><a id="barnsley-fern-ref-3" href="#barnsley-fern-source-3">3</a></sup>

## Further reading

- [Barnsley fern — Wikipedia](https://en.wikipedia.org/wiki/Barnsley_fern)
- [Barnsley’s fern — MathWorld](https://mathworld.wolfram.com/BarnsleysFern.html)

## Sources and notes

1. <span id="barnsley-fern-source-1"></span> Michael F. Barnsley and Andrew Vince, [The Chaos Game on a General Iterated Function System](https://arxiv.org/pdf/1005.0322), *Ergodic Theory and Dynamical Systems* 31, no. 4 (2011), 1073–1079. Theorem 3 establishes almost-sure convergence under conditions that include these contracting maps and fixed positive selection probabilities. [Back](#barnsley-fern-ref-1)
2. <span id="barnsley-fern-source-2"></span> John E. Hutchinson, [Fractals and Self Similarity](https://maths-people.anu.edu.au/~john/Assets/Research%20Papers/fractals_self-similarity.pdf), *Indiana University Mathematics Journal* 30 (1981), 713–747. Sections 3.1–3.2 prove uniqueness of the compact invariant set and convergence of whole-set iteration. [Back](#barnsley-fern-ref-2)
3. <span id="barnsley-fern-source-3"></span> Hutchinson, same paper, Section 4.4. Positive rule probabilities change the distribution of dots while preserving the set they approach. [Back](#barnsley-fern-ref-3)
