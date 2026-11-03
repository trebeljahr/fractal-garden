# Romanesco

Follow a curved row of bumps around a Romanesco cauliflower. Other rows turn the opposite way. Each bump carries smaller spiral rows of its own.<sup><a id="romanesco-ref-1" href="#romanesco-source-1">1</a></sup>

Start with a cone. Raise small peaks along a spiral around it. Turn each new peak about 137.5 degrees and make it smaller toward the tip. This turn is called the golden angle.<sup><a id="romanesco-ref-2" href="#romanesco-source-2">2</a></sup> Repeat the spiral on each peak, and underneath the cone. Neighbouring peaks join along their edges.

<figure data-construction-player="romanesco"></figure>

Viewed from above, the peaks line up in spiral rows. Count them in the figure: 8 rows wind one way, 13 wind the other, and 21 wind the first way again. These are neighbouring Fibonacci numbers. Eight turns of 137.5 degrees land 20 degrees past three full turns, so every eighth peak sits a little way around from the last and closer to the tip. That makes a row. Thirteen turns land 12 degrees short of five full turns, so those rows wind the other way. The same rows repeat on each smaller head.<sup><a id="romanesco-ref-3" href="#romanesco-source-3">3</a></sup>

This is a geometric model inspired by Romanesco. A real cauliflower has a smallest bump.

## Further exploring

- [Romanesco broccoli — Wikipedia](https://en.wikipedia.org/wiki/Romanesco_broccoli)
- [Why do cauliflowers look so odd? — The Conversation](https://theconversation.com/why-do-cauliflowers-look-so-odd-weve-cracked-the-maths-behind-their-fractal-shape-164121)
- [How Romanesco cauliflower grows spiraling fractal cones — Science News Explores](https://www.snexplores.org/article/romanesco-cauliflower-fractal-spiral-genetics-biology)

## Sources and notes

1. <span id="romanesco-source-1"></span> [Cauliflower fractal forms arise from perturbations of floral gene networks](https://authors.library.caltech.edu/records/c4rmy-fg834). [Back](#romanesco-ref-1)
2. <span id="romanesco-source-2"></span> [Phyllotaxis as geometric canalization during plant development](https://journals.biologists.com/dev/article-pdf/147/19/dev165878/1968297/dev165878.pdf). [Back](#romanesco-ref-2)
3. <span id="romanesco-source-3"></span> Calculation: before the peaks are tilted upward, their positions turn through the golden angle and shrink toward the tip by $e^{-0.015}$ per step. Each peak sits in a hexagonal cell. Its six neighbouring cells hold the peaks 8, 13 and 21 steps away on either side. Each peak repeats this construction. The renderer adds smaller peaks as you approach. [Back](#romanesco-ref-3)
