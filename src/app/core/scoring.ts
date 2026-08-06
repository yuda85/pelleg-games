/** Stars for one question: a clean solve is 3, and the floor is 1 — never zero. */
export function starsFor(mistakes: number): 1 | 2 | 3 {
  if (mistakes === 0) return 3;
  if (mistakes <= 2) return 2;
  return 1;
}
