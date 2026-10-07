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

## Random rules

Give one symbol several rules and each replacement picks one of them at random. The weight next to a rule sets how often it wins. The seed under **Advanced** fixes the random choices, so a shared link always grows the same plant.

## Share and submit

The address bar always holds your current system, so you can copy the link and send it to someone. **Submit as preset** opens GitHub with a preset file filled in. Commit it there and GitHub opens a pull request to the Fractal Garden. Accepted presets appear in the preset list for everyone.

## Further reading

Most of the 3D presets, and every preset marked ABOP with a figure number, come from [The Algorithmic Beauty of Plants](http://algorithmicbotany.org/papers/#abop) by Przemysław Prusinkiewicz and Aristid Lindenmayer. The book is free to read online.

The finished L-system pages in the garden include the [Hilbert Curve](/l-system/hilbert-curve), the [Koch Snowflake](/l-system/koch-snowflake) and [Fern 1](/l-system/fern-1).
