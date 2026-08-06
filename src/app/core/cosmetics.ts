/** Everything coins can buy, and everything a finished set can unlock. */
import type { GameId } from './progress';

export interface ColorSkin {
  id: string;
  name: string;
  price: number;
  /** Droplet body gradient, light stop then dark stop. */
  from: string;
  to: string;
}

export interface Hat {
  id: string;
  name: string;
  price: number;
}

export interface Sticker {
  id: string;
  name: string;
  game: GameId;
  /** Which set of that game unlocks it. */
  setIndex: number;
}

/** The starter colour is free and always owned, so the shop is never a wall. */
export const COLORS: readonly ColorSkin[] = [
  { id: 'aqua', name: 'תְּכֵלֶת', price: 0, from: '#67e8f9', to: '#0891b2' },
  { id: 'grape', name: 'עֲנָבִים', price: 30, from: '#c4b5fd', to: '#6d28d9' },
  { id: 'mango', name: 'מַנְגּוֹ', price: 30, from: '#fde68a', to: '#d97706' },
  { id: 'melon', name: 'אֲבַטִּיחַ', price: 45, from: '#fda4af', to: '#be123c' },
  { id: 'mint', name: 'נַעֲנָע', price: 45, from: '#a7f3d0', to: '#047857' },
  { id: 'galaxy', name: 'גָּלַקְסִיָּה', price: 90, from: '#a5b4fc', to: '#312e81' },
];

export const HATS: readonly Hat[] = [
  { id: 'crown', name: 'כֶּתֶר', price: 60 },
  { id: 'cap', name: 'כּוֹבַע מִצְחִיָּה', price: 40 },
  { id: 'bow', name: 'סֶרֶט', price: 40 },
  { id: 'wizard', name: 'כּוֹבַע קוֹסֵם', price: 80 },
  { id: 'flower', name: 'פֶּרַח', price: 50 },
];

export const STICKERS: readonly Sticker[] = [
  { id: 'nikud-drop', name: 'טִפָּה', game: 'nikud', setIndex: 0 },
  { id: 'nikud-fish', name: 'דָּג', game: 'nikud', setIndex: 1 },
  { id: 'nikud-boat', name: 'סִירָה', game: 'nikud', setIndex: 2 },
  { id: 'nikud-star', name: 'כּוֹכָב', game: 'nikud', setIndex: 3 },
  { id: 'nikud-rainbow', name: 'קֶשֶׁת', game: 'nikud', setIndex: 4 },
  { id: 'nikud-crown', name: 'כֶּתֶר', game: 'nikud', setIndex: 5 },
  { id: 'math-anchor', name: 'עֹגֶן', game: 'math', setIndex: 0 },
  { id: 'math-shell', name: 'צֶדֶף', game: 'math', setIndex: 1 },
  { id: 'math-compass', name: 'מַצְפֵּן', game: 'math', setIndex: 2 },
  { id: 'math-lighthouse', name: 'מִגְדַּלּוֹר', game: 'math', setIndex: 3 },
  { id: 'math-whale', name: 'לִוְיָתָן', game: 'math', setIndex: 4 },
  { id: 'math-treasure', name: 'אוֹצָר', game: 'math', setIndex: 5 },
  { id: 'memory-shell', name: 'צְדָפָה', game: 'memory', setIndex: 0 },
  { id: 'memory-crab', name: 'סַרְטָן', game: 'memory', setIndex: 1 },
  { id: 'memory-seahorse', name: 'סוּסוֹן יָם', game: 'memory', setIndex: 2 },
  { id: 'memory-coral', name: 'אַלְמֻגָּה', game: 'memory', setIndex: 3 },
  { id: 'memory-pearl', name: 'פְּנִינָה', game: 'memory', setIndex: 4 },
  { id: 'memory-octopus', name: 'תַּמְנוּן', game: 'memory', setIndex: 5 },
  { id: 'shapes-cube', name: 'קֻבִּיָּה', game: 'shapes', setIndex: 0 },
  { id: 'shapes-ball', name: 'כַּדּוּר', game: 'shapes', setIndex: 1 },
  { id: 'shapes-cone', name: 'חָרוּט', game: 'shapes', setIndex: 2 },
  { id: 'shapes-pyramid', name: 'פִּירָמִידָה', game: 'shapes', setIndex: 3 },
  { id: 'shapes-prism', name: 'מְנסָרָה', game: 'shapes', setIndex: 4 },
  { id: 'shapes-star', name: 'כּוֹכָב תְּלַת־מֵמַדִּי', game: 'shapes', setIndex: 5 },
];

export function colorById(id: string): ColorSkin {
  return COLORS.find((c) => c.id === id) ?? COLORS[0];
}

export function stickerForSet(game: GameId, setIndex: number): Sticker {
  const forGame = STICKERS.filter((s) => s.game === game);
  return forGame[setIndex % forGame.length];
}
