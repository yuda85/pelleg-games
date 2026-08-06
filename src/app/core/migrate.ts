import { NIKUD_SET_COUNT, wordsForSet } from '../games/nikud/nikud-sets';
import type { GameId, SaveState } from './progress';

/**
 * One-time compatibility shim for saves written before the app had a second
 * game. This is the single place in `core/` allowed to import from `games/` —
 * seeding a v1 save's set scores needs to know what a nikud set contained, and
 * duplicating that knowledge here would be worse than the layering exception.
 */
interface SaveV1 {
  coins: number;
  stars: Record<string, number>;
  /** A bare count: in v1, nikud was the only game. */
  setsDone: number;
  stickers: string[];
  owned: string[];
  hat: string | null;
  color: string;
  soundOn: boolean;
  speechOn: boolean;
  chill: boolean;
}

/**
 * v1 and v2 disagree on the type of `setsDone` — a bare number versus a map —
 * so the two shapes cannot be intersected. Narrowing off that field is what
 * tells them apart.
 */
function isV1(data: Record<string, unknown>): boolean {
  return typeof data['setsDone'] === 'number';
}

export function migrate(raw: unknown, defaults: SaveState): SaveState {
  if (raw === null || typeof raw !== 'object') return { ...defaults };
  const data = raw as Record<string, unknown>;

  if (!isV1(data)) {
    return { ...defaults, ...(data as Partial<SaveState>), version: 2 };
  }

  const v1 = data as unknown as SaveV1;
  const setsDone: Record<GameId, number> = { ...defaults.setsDone, nikud: v1.setsDone };
  return {
    ...defaults,
    ...v1,
    version: 2,
    setsDone,
    setStars: seedSetStars(v1.stars ?? {}),
    stickers: (v1.stickers ?? []).map((id) => `nikud-${id}`),
  };
}

/**
 * v1 stored a best score per word and summed them to score a set. v2 stores one
 * best-run score per set, so the old per-word bests are summed once, here.
 */
function seedSetStars(wordStars: Record<string, number>): Record<string, number> {
  const seeded: Record<string, number> = {};
  for (let i = 0; i < NIKUD_SET_COUNT; i++) {
    const total = wordsForSet(i).reduce((sum, word) => sum + (wordStars[word.id] ?? 0), 0);
    if (total > 0) seeded[`nikud:${i}`] = total;
  }
  return seeded;
}
