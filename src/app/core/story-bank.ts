import { NACHAL_DOAR } from './story-doar';
import { NACHAL_SHTIKA } from './story-shtika';
import { NACHAL_TEATRON } from './story-teatron';
import { NACHAL_TSAYAR } from './story-tsayar';
import type { Story } from './story-types';

/**
 * What ships with the app.
 *
 * These stories are seeded, not stored: `stories.ts` overlays the device's own
 * edits on top, so opening one in the editor and changing a line shadows it
 * without a rebuild, and deleting the local copy brings the original back.
 *
 * Order is reading order. A new story is one more file beside this one, and
 * one more entry here.
 */
export const SEED_STORIES: readonly Story[] = [
  NACHAL_TEATRON,
  NACHAL_DOAR,
  NACHAL_TSAYAR,
  NACHAL_SHTIKA,
];
