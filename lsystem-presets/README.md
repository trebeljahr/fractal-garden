# L-system presets

Each JSON file in this folder is one preset in the [L-System Explorer](https://fractal.garden/l-system/explorer). The file name (without `.json`) is the preset's id in links such as `/l-system/explorer#preset=fern-1`.

## Adding a preset

The simplest way is the **Submit as preset** button in the explorer. It opens GitHub with the file filled in, and committing it opens a pull request.

You can also add a file by hand. Run `pnpm validate:presets` to check it. The build runs the same check.

## Format

Only `name`, `axiom` and `rules` are required. Every other field falls back to the explorer's default.

```json
{
  "name": "Fern 1",
  "author": "Your name",
  "description": "One or two sentences shown under the preset list.",
  "dimension": "2d",
  "axiom": "X",
  "rules": [
    { "symbol": "X", "replacement": "F+[[X]-X]-F[-FX]+X" },
    { "symbol": "F", "replacement": "FF" }
  ],
  "angle": -25,
  "iterations": 6,
  "color": "#adff00",
  "colorEnd": "#18fce0"
}
```

| Field | Meaning | Default |
| --- | --- | --- |
| `dimension` | Optional. A system is 3D when it uses `& ^ \ / $`, otherwise 2D. The validator checks that this field agrees | set by the symbols |
| `rules[].weight` | Relative chance when a symbol has several rules | `1` |
| `angle` | Turn angle in degrees for `+ - & ^ \ /` | `25.7` |
| `iterations` | Generations to grow, 0 to 24 | `4` |
| `startAngle` | Starting direction in degrees, clockwise from up | `0` |
| `lengthFactor` | Step length multiplier for `>` (divisor for `<`) | `0.7` |
| `widthFactor` | Line width multiplier for `!` (divisor for `#`) | `0.7` |
| `color`, `colorEnd` | Hex colors for the gradient | `#adff00` |
| `colorMode` | `"gradient"`, `"depth"` or `"solid"` | `"gradient"` |
| `background` | Hex backdrop color | `#252424` |
| `lineWidth` | Base line width in pixels | `1.5` |
| `drawSymbols` | Symbols that draw a step | `"FG"` |
| `moveSymbols` | Symbols that move without drawing | `"f"` |
| `seed` | Random seed for weighted rules | `1` |

The validator in `scripts/validate-lsystem-presets.mjs` uses the same checks as the explorer (`utils/lsystem/spec.ts`).
