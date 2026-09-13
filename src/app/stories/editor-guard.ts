import type { CanDeactivateFn } from '@angular/router';
import type { StoryEditor } from './editor';

/**
 * Leaving the editor with an unsaved draft asks first. The editor holds the
 * whole story in a draft until "שמירה", which is what makes a half-typed
 * chapter losable — and what makes this guard worth having.
 */
export const canLeaveEditor: CanDeactivateFn<StoryEditor> = (editor) => editor.canLeave();
