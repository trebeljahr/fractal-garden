# Hilbert Curve

Divide a square into four squares. Put a smaller U-shaped route in each, then rotate the copies so their ends connect. Repeat inside every smaller square. The limiting route is a continuous map from an interval onto the entire square.<sup><a id="hilbert-curve-ref-1" href="#hilbert-curve-source-1">1</a></sup>

This page starts with W and rewrites:

```
V → -WF+VFV+FW-
W → +VF-WFW-FV+
```

F draws forward. V and W draw nothing. They mark the orientations of later copies. Each production supplies four V/W symbols and three connecting strokes.

<figure data-lesson="lsystem-hilbert"></figure>

The first rewrite makes a U with three strokes. At order $n$, the path visits every point of a $2^n\times2^n$ grid exactly once. It contains $4^n-1$ segments. If $s_n$ is the segment count, four copies plus three joins give $s_{n+1}=4s_n+3$.

Each finite path leaves gaps. To understand the limit, follow one nested sequence of squares. Their side lengths tend to zero, so they identify one point. Every point belongs to such a sequence, which explains how the limit reaches the whole square.

Continuity does not imply a reversible address system with unique addresses. Neighboring positions along the path stay nearby in the square. Nearby square positions can still have distant path addresses.

The [3D version](/l-system/hilbert-curve-3d) visits cubes instead. Compare the [Sierpinski curve](/l-system/sierpinski-curve) and [Dragon curve](/l-system/dragon-curve) for different arrangements of right-angle turns.

## Sources and notes

1. <span id="hilbert-curve-source-1"></span> Herman Haverkort, [How many three-dimensional Hilbert curves are there?](https://pure.tue.nl/ws/portalfiles/portal/87535424/298_1389_1_PB.pdf), Journal of Computational Geometry 8(1), 206–281, 2017. Introduction and section 2 describe nested subdivisions and continuous, surjective mappings. The local productions and segment recurrence are derived from this page’s rules. [Back](#hilbert-curve-ref-1)
