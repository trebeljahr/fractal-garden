// Tribonacci substitution 1 → 12, 2 → 13, 3 → 1, letters stored as 0, 1, 2.
const SUBSTITUTION = [[0, 1], [0, 2], [0]];

export function tribonacciWord(length: number) {
  let word: number[] = [0];

  while (word.length < length) {
    const next: number[] = [];
    for (const letter of word) {
      next.push(...SUBSTITUTION[letter]);
    }
    word = next;
  }

  return Uint8Array.from(word.slice(0, length));
}

// Left eigenvector of the substitution matrix for one of its two complex,
// contracting eigenvalues α (roots of x³ = x² + x + 1). Taking the dot product
// with an abelianised prefix kills the expanding direction and leaves its
// coordinate in the contracting plane, as a complex number.
export function contractingProjection(): Array<[number, number]> {
  let beta = 2;
  for (let i = 0; i < 50; i++) {
    beta -= (beta ** 3 - beta ** 2 - beta - 1) / (3 * beta ** 2 - 2 * beta - 1);
  }

  const re = (1 - beta) / 2;
  const im = Math.sqrt(1 / beta - re * re);
  const abs2 = re * re + im * im;

  return [
    [1, 0],
    [re - 1, im],
    [re / abs2, -im / abs2],
  ];
}
