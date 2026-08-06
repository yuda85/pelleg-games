/**
 * The wardrobe.
 *
 * Coins earned in the three games are spent here. Nothing bought makes any game
 * easier — it is purely a place to put the coins, which is what makes earning
 * them feel worth it.
 */

export type Slot = 'outfit' | 'hair' | 'shoes' | 'extra';

export interface Garment {
  id: string;
  name: string;
  slot: Slot;
  price: number;
  /** Swatch shown on the wardrobe card. */
  swatch: string;
}

export const SLOTS: readonly { id: Slot; name: string }[] = [
  { id: 'outfit', name: 'בְּגָדִים' },
  { id: 'hair', name: 'תִּסְפֹּרֶת' },
  { id: 'shoes', name: 'נַעֲלַיִם' },
  { id: 'extra', name: 'אַקְּסֶסוֹרִיז' },
];

/**
 * The first item in every slot is free, so she can dress the doll fully from
 * the moment she opens it and the wardrobe never reads as a paywall.
 */
export const WARDROBE: readonly Garment[] = [
  // --- outfits -------------------------------------------------------------
  { id: 'dress-aqua', name: 'שִׂמְלָה תְּכֵלֶת', slot: 'outfit', price: 0, swatch: '#67e8f9' },
  { id: 'dress-rose', name: 'שִׂמְלַת וֶרֶד', slot: 'outfit', price: 40, swatch: '#fb7185' },
  { id: 'overalls', name: 'אוֹבֶרוֹל גִּ׳ינְס', slot: 'outfit', price: 55, swatch: '#3b82f6' },
  { id: 'tutu', name: 'טוּטוּ שֶׁל בָּלֶט', slot: 'outfit', price: 70, swatch: '#f9a8d4' },
  { id: 'space', name: 'חֲלִיפַת חָלָל', slot: 'outfit', price: 110, swatch: '#a5b4fc' },
  { id: 'raincoat', name: 'מְעִיל גֶּשֶׁם', slot: 'outfit', price: 85, swatch: '#fbbf24' },

  // --- hair ----------------------------------------------------------------
  { id: 'hair-long', name: 'שֵׂעָר אָרֹךְ', slot: 'hair', price: 0, swatch: '#78350f' },
  { id: 'hair-braids', name: 'צַמּוֹת', slot: 'hair', price: 35, swatch: '#92400e' },
  { id: 'hair-bun', name: 'קוּקוּ', slot: 'hair', price: 35, swatch: '#a16207' },
  { id: 'hair-curly', name: 'תַּלְתַּלִּים', slot: 'hair', price: 50, swatch: '#713f12' },

  // --- shoes ---------------------------------------------------------------
  { id: 'shoes-sneakers', name: 'נַעֲלֵי סְפּוֹרְט', slot: 'shoes', price: 0, swatch: '#e11d48' },
  { id: 'shoes-boots', name: 'מַגָּפַיִם', slot: 'shoes', price: 40, swatch: '#7c2d12' },
  { id: 'shoes-ballet', name: 'נַעֲלֵי בָּלֶט', slot: 'shoes', price: 45, swatch: '#f9a8d4' },

  // --- extras --------------------------------------------------------------
  { id: 'extra-bow', name: 'סֶרֶט', slot: 'extra', price: 25, swatch: '#f43f5e' },
  { id: 'extra-glasses', name: 'מִשְׁקָפַיִם', slot: 'extra', price: 30, swatch: '#334155' },
  { id: 'extra-crown', name: 'כֶּתֶר', slot: 'extra', price: 90, swatch: '#fbbf24' },
  { id: 'extra-wings', name: 'כְּנָפַיִם', slot: 'extra', price: 120, swatch: '#c4b5fd' },
];

export function garmentsFor(slot: Slot): Garment[] {
  return WARDROBE.filter((g) => g.slot === slot);
}

export function garmentById(id: string): Garment | undefined {
  return WARDROBE.find((g) => g.id === id);
}

/**
 * How the doll herself looks, as opposed to what she wears.
 *
 * Kept as plain values so the avatar can be matched to a real child from a
 * photograph by editing this one object — no artwork changes needed.
 */
export interface Look {
  skin: string;
  skinShade: string;
  hair: string;
  hairDark: string;
  eyes: string;
}

export const LOOK: Look = {
  skin: '#f5d0b0',
  skinShade: '#e0b48d',
  hair: '#6b4423',
  hairDark: '#4a2f18',
  eyes: '#5b3a1f',
};
