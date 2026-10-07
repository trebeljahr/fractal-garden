# L-System Explorer

An [L-system](https://en.wikipedia.org/wiki/L-system) grows a drawing from a short string and a few replacement rules. The biologist Aristid Lindenmayer invented them in 1968 to describe how plants grow. Every L-system page in the Fractal Garden uses one. Here you write your own.

## How it works

You start with the **axiom**, a short string such as `F`. Each **generation** replaces every symbol that has a rule with that rule's text. Symbols without a rule stay as they are.

With the rule `F → F+F-F-F+F`, the first generations of the axiom `F` are:

```
F
F+F-F-F+F
F+F-F-F+F+F+F-F-F+F-F+F-F-F+F-F+F-F-F+F+F+F-F-F+F
```

After the last generation, a turtle reads the string from left to right and draws. `F` draws a line forward, `+` turns right by the angle, and `-` turns left.

## The symbols

- `F` and `G`: draw one step forward
- `f`: move one step forward without drawing
- `+` and `-`: turn right and left by the angle
- `|`: turn around
- `[` and `]`: remember the position and direction, then go back to it. This makes branches.
- `&` and `^`: pitch down and up (3D)
- `\` and `/`: roll left and right (3D)
- `$`: roll until level with the ground (3D)
- `>` and `<`: multiply and divide the step length by the length factor
- `!` and `#`: multiply and divide the line width by the width factor

Any other letter, for example `X`, draws nothing. It only steers the rewriting. You can change which letters draw or move under **Advanced**.

The explorer switches to 3D by itself as soon as the system uses one of `& ^ \ / $`. In 3D every line becomes a lit tube. Drag to orbit all the way around, shift-drag or right-drag to move the orbit center, and scroll to fly towards the spot under the cursor.

## Endless zoom

In 2D you can keep zooming, and the explorer grows later generations where you look. It does not rebuild the whole string. Each symbol of one generation becomes a piece of the next, so the drawing is a tree of pieces. The explorer works out once how each symbol moves and turns the turtle after any number of generations. Then it walks down that tree only where the view needs it: pieces outside the view are skipped in one step, and pieces smaller than a pixel are drawn as a single line. The stats under the editor show which generation you are looking at.

Deep in, ordinary floating point numbers cannot tell the view's position apart from its neighbours'. So the view's position, and the few parts of the drawing that are far larger than the screen, are kept as whole numbers with as many digits as the zoom needs. Once a part is small enough, the rest of it is worked out with ordinary numbers in screen pixels. That keeps the zoom precise at any depth, without slowing down.

A later generation is a little bigger than the one before, and some curves also turn (the dragon curve by 45° each time). The explorer measures that and shrinks and turns each generation back, so the new detail lines up with what you saw before.

Endless zoom needs one rule per symbol, because random rules give every copy a different shape. It also needs a drawing that grows from one generation to the next. Drawings that grow denser with every generation, such as dense bushes or the Penrose tiling, would need ever more lines, so there the explorer stops at the deepest generation that fits in about 300,000 lines.

## Random rules

Give one symbol several rules and each replacement picks one of them at random. The weight next to a rule sets how often it wins: its chance is its weight divided by the total weight of that symbol's rules, and the explorer shows that chance as a percentage under each weight. The seed under **Advanced** fixes the random choices, so a shared link always grows the same plant.

## Share and submit

The address bar always holds your current system, so you can copy the link and send it to someone. **Submit as preset** opens GitHub with a preset file filled in. Commit it there and GitHub opens a pull request to the Fractal Garden. Accepted presets appear in the preset list for everyone.

## Further reading

Most of the 3D presets, and every preset marked ABOP with a figure number, come from [The Algorithmic Beauty of Plants](http://algorithmicbotany.org/papers/#abop) by Przemysław Prusinkiewicz and Aristid Lindenmayer. The book is free to read online.

The finished L-system pages in the garden include the [Hilbert Curve](/l-system/hilbert-curve), the [Koch Snowflake](/l-system/koch-snowflake) and [Fern 1](/l-system/fern-1).
