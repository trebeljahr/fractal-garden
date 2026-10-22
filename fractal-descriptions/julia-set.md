# Julia Set

Change the complex constant in this Julia set explorer to reshape its spirals and branches. Each constant gives a different fractal. Some Julia sets form connected shapes, while others break into dust-like pieces.

Zoom along an edge to find smaller branches that resemble the larger pattern. Changing the constant changes that pattern throughout the image.

## Try a different shape

Open **Fractal Studio Controls** and change **Starting point** from **Rabbit spiral** to **Sea spiral** or **Cauliflower bloom**. These presets choose values for the constant $c$.

Drag the point in the complex plane to see how nearby values change the shape. **Real (x)** runs horizontally; **Imaginary (y)** runs vertically. You can also type either coordinate below the plane. Drag the image to pan. Use the scroll wheel to zoom toward the pointer, or pinch with two fingers on a touch screen.

Use **Look** to compare coloring styles at the same location. **Palette** changes the colors while keeping the constant fixed. If a dark patch near an edge lacks detail, increase **Iterations** to give those points a longer escape test.

<figure data-article-images="julia"></figure>

## One Julia set for each Mandelbrot point

The [Mandelbrot set](/mandelbrot) and these Julia sets share the rule:

$$
z_{n+1} = z_n^2 + c
$$

The Mandelbrot explorer starts every sequence at $z_0 = 0$ and uses each pixel as a different value of $c$. The Julia explorer keeps $c$ fixed and uses each pixel as a different starting value $z_0$.

This makes the Mandelbrot set a [map of the Julia family](https://pi.math.cornell.edu/~lipa/mec/lesson5.html). A value of $c$ in the Mandelbrot set gives a connected Julia set. A value outside it gives disconnected dust. Near the Mandelbrot boundary, small changes to $c$ can produce large changes in the Julia image.

Here, $c$ stays fixed at $-0.8 + 0.156i$. Move the starting point, then follow its orbit one step at a time. Compare this with the Mandelbrot example, where the starting point stays at zero.

<figure data-orbit="julia"></figure>

## What the image shows

The filled Julia set contains all starting points whose sequences stay bounded forever. Its boundary is the Julia set itself.

With default **Smooth escape time** coloring, the dark region approximates the filled set. The surrounding colors describe how quickly other starting points escape. The finite **Iterations** limit means that a slowly escaping point can still appear dark.

**Orbit trap** colors points by how close their sequences come to the origin, including points that do not escape. This can reveal patterns inside the dark region. The [Burning Ship explorer](/burning-ship) offers the same coloring controls with a different iteration rule.
