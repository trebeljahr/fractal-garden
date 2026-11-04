# Repository instructions

Read and follow `/Users/rico/.agents/AGENTS.md` before repository work. It governs
Git integration, worktrees, remote writes, previews and the project vault.

## Fractal explanations

These articles explain fractals to curious beginners. Apply this standard to
`fractal-descriptions/` and text inside the interactive lessons.

### Voice comes first

Rico's correction, 2026-10-23: explain things simply, with the patience needed
for a five-year-old and the brevity of Derek Sivers. Fewer words, chosen well.
Assume no mathematical background. Respect the reader; do not use baby talk.

Rico's correction, 2026-11-04: short and accurate is not enough. Results stated
one after another kill the discovery. Write like a 3Blue1Brown or Numberphile
video: someone talking you through a thing they find fascinating. Where this
conflicts with an older rule below, this one wins. `fractal-descriptions/mandelbrot.md`
is the reference.

- Open with a question the reader would really ask or a thing they can notice.
  Raise the obvious objection, then answer it. For example: “Why on earth should
  they match?” then “Shouldn't all those extra nudges ruin the match?” The answer
  must follow right away and must explain the mechanism.
- Do not open a passage with a stage direction such as “Now zoom in on the edge”,
  “Look at the round bulb” or “Move the slider”. Say how to use a demo only as far
  as the reader needs it, and tie it to what they want to find out.
- A short human reaction is fine when a real discovery comes with it, such as
  “Those digits look familiar.” It is not a substitute for the discovery.
- Start with something the reader can see, draw, remove, rotate or try. Explain one
  step at a time. Build the picture before introducing a name or equation.
- Use ordinary spoken English, concrete nouns and active verbs. Keep sentences
  short, but vary their rhythm. Keep the words needed to make them easy to read.
- Let excitement come from an actual discovery: a square tunnel makes a star
  hole, a paper fold makes a dragon, a fish becomes a triangle. No generic praise.
- Explain a technical term before using it. Remove terms, formulas and
  derivations that do not help this particular explanation. Do not compress
  an argument into jargon such as "outer-third depth coordinate".
- Keep useful, verified facts. Mathematical accuracy does not require a formal
  tone. State necessary qualifications once, in plain words, next to the claim.
- No abstract throat-clearing, forced contrasts, stock sentence patterns or
  closing summaries. Read every paragraph aloud. If it
  would sound strange while explaining the picture to someone, rewrite it.
- Information density means useful understanding per word. It does not mean
  maximum facts, symbols or technical terms per sentence. Do not turn these
  articles into compressed research summaries.
- Use literal geometric operations. Say which square is removed, which line is
  replaced and how a size changes. Do not describe a screen operation as cutting
  paper. Physical folding belongs only where an actual paper construction applies.
- No lyrical or personified explanations such as "every square creates eight
  places for the next cut", "numbers take a journey" or "a rule grows a plant".
  A short sentence can still be vague. Explain the intermediate step that makes
  the next sentence follow; do not fill that gap with a pleasant-sounding phrase.
  An everyday figure of speech is fine when the mechanism is stated next to it:
  “a point holds out” beside the step counts, “playing catch-up” beside the growth
  of each nudge.
- The shared construction player has no stock heading or injected summary.
  Construction explanations belong in the article, in the relevant sequence.

### Choose fewer facts — the Mosely example

Rico's correction, 2026-10-25: short sentences can still add up to a wordy,
uninteresting explanation. Choose what earns the reader's attention before
polishing the wording. The aim is “huh, interesting, I didn't know that.”

He rejected six paragraphs that stacked volume ratios, surface-area totals,
a dimension tutorial, logarithms and finite-model caveats. The useful core was:

> Its volume still approaches zero, while its surface area grows without bound.

Keep that discovery and explain its concrete cause. For example:

> Removing cubes exposes new faces inside the holes. Repeat forever and the
> volume approaches zero, while the surface area grows without bound. This
> happens with either center option.

- Cut side lessons that do not help explain the discovery. A true fact does not
  automatically belong in the article. Do not add a dimension tutorial to every
  fractal or retain numbers merely because they were researched.
- Keep the few steps needed to understand why it happens. Do not replace them
  with lyrical language, slogans, generic wonder or claims that it is surprising.
- Accuracy is required; exhaustive coverage is not. Put necessary calculation
  detail in a source note. Keep essential qualifications beside the claim, once.
- Before finishing, name the discovery in one plain sentence. Read the passage
  aloud against this example. Remove any sentence that neither helps the reader
  understand the discovery nor prevents a real misunderstanding.

This example guides article and lesson prose. Do not turn it into a stock
paragraph or remove a useful construction step just to meet a word count.

### Accuracy and sources

- Explain the exact construction implemented here. Check the generator, seed,
  scale, orientation and iteration convention before importing a named shape's
  properties from a source.
- Every paragraph must teach a construction step, derivation, concrete connection
  or sourced fact. Remove visual filler, generic praise and closing restatements.
  Do not pad articles to a common length or impose the same section structure.
- Research nontrivial claims. Prefer original papers and creators' mathematical
  explanations. Use reference works to find primary sources. Open the cited
  material and confirm it supports the adjacent claim.
- Use numbered inline footnotes and a final **Sources and notes** section with
  linked article titles and return links. Normally include no author list,
  publication details or commentary after the link. Add a note only when the
  reader needs a qualification or a calculation explained. Label calculations
  derived directly from this implementation; do not attribute them to a paper
  that only supplies a general method.
- A paper's footnote describes only what that paper supports. Never append claims
  about this site's renderer, presets or calculations to a paper's citation. Put
  a necessary calculation note in its own numbered entry, labelled “Calculation”
  or “Diagram construction”. If the article already shows the calculation, do
  not repeat its provenance in a footnote. Label general-method references as
  background and place them beside the method, not beside this site's numbers.
- Link each outside page once per article (Rico, 2026-11-03). **Further exploring**
  lists only pages the article does not already link, and includes the matching
  MathWorld entry when one exists. To cite a source again, reuse its footnote
  number and give each citation its own return link.
- When **Further exploring** has both videos and text, split it under `### Videos`
  and then `### Reading` (Rico, 2026-11-03). With only one kind, use no subheading.
  Links to this site's own pages go above the subheadings.
- Every **Further exploring** link must clearly be more about this fractal (Rico,
  2026-11-03). Biographies, histories of fractals and general fractal or method
  pages do not belong. A page named for a neighboring shape counts only if it spends
  real time on this one, as Numberphile's Mandelbrot video and Mathigon's Mandelbrot
  lesson do for Julia sets. A parent page counts only if it covers this variant. A
  general L-system or IFS page does not count because this rule appears somewhere
  on it; link the matching page on this site instead. The exception is Fern 1–4,
  Board and Crystal (Rico, 2026-11-03): no page covers them alone, so they may link
  general L-system material that teaches their kind of rule.
- Further exploring has no fixed length, but it must not feel like too much. Drop a
  link that repeats another. Sparse lists disappoint readers too (Rico, 2026-11-03),
  so search for videos and interactive pages as well as text before leaving one
  short. Do not pad it: when nothing passes these rules, a short list is fine, and
  so is no section.
- Prefer links that will stay up: Wikipedia, MathWorld, arXiv, established
  publishers, universities and long-running sites of known authors. Skip small
  personal pages, press releases and anything else likely to disappear. Run
  `pnpm check:links` to find outside links that have died.
- Read a link before adding it. It needs an identifiable expert or established
  publisher, real substance on this construction and something the other links do
  not give. It must be in English and open without a paywall, certificate warning
  or bot check.
- Judge a video from its transcript, not its title or description. If a page only
  wraps a video or repeats its script, link the video directly. Keep the page when
  it adds its own text or an interactive.
- Distinguish finite drawings from their limits, strokes from distinct edges,
  counted area from covered area, surfaces from enclosed solids, and similarity
  exponents from proved dimensions. State conjectures and estimates as such.
- Preserve existing interactive figure markers. Verify equations, internal links,
  footnote targets and return links in the rendered article.

Research notes and drafts belong in the existing `ai-work-notes` project vault.
Production article content and code-specific instructions stay in this repository.
