import { Routes } from '@angular/router';
import { canLeaveEditor } from './stories/editor-guard';

/** Every screen is lazy — the hub should not ship the game it hasn't opened yet. */
export const routes: Routes = [
  {
    path: '',
    title: "פֶּלֶגֵ'ימְס",
    loadComponent: () => import('./hub/hub').then((m) => m.Hub),
  },
  {
    path: 'nikud',
    title: 'נַחַל הַנִּקּוּד',
    loadComponent: () => import('./games/nikud/nikud-map').then((m) => m.NikudMap),
  },
  {
    path: 'nikud/:setIndex',
    title: 'נַחַל הַנִּקּוּד',
    loadComponent: () => import('./games/nikud/nikud-play').then((m) => m.NikudPlay),
  },
  {
    path: 'math',
    title: 'קְפִיצַת הַמִּסְפָּרִים',
    loadComponent: () => import('./games/math/math-map').then((m) => m.MathMap),
  },
  {
    path: 'math/:setIndex',
    title: 'קְפִיצַת הַמִּסְפָּרִים',
    loadComponent: () => import('./games/math/math-play').then((m) => m.MathPlay),
  },
  {
    path: 'memory',
    title: 'זִכָּרוֹן מִלִּים',
    loadComponent: () => import('./games/memory/memory-map').then((m) => m.MemoryMap),
  },
  {
    path: 'memory/:setIndex',
    title: 'זִכָּרוֹן מִלִּים',
    loadComponent: () => import('./games/memory/memory-play').then((m) => m.MemoryPlay),
  },
  {
    path: 'shapes',
    title: 'עוֹלַם הַצּוּרוֹת',
    loadComponent: () => import('./games/shapes/shapes-map').then((m) => m.ShapesMap),
  },
  {
    path: 'shapes/:setIndex',
    title: 'עוֹלַם הַצּוּרוֹת',
    loadComponent: () => import('./games/shapes/shapes-play').then((m) => m.ShapesPlay),
  },
  {
    path: 'stories',
    title: 'סִפּוּרִים בְּהֶמְשֵׁכִים',
    loadComponent: () => import('./stories/library').then((m) => m.Library),
  },
  {
    // Before ':storyId', or "editor" would be read as a story id.
    path: 'stories/editor',
    title: 'עוֹרֵךְ הַסִּפּוּרִים',
    loadComponent: () => import('./stories/editor').then((m) => m.StoryEditor),
    canDeactivate: [canLeaveEditor],
  },
  {
    path: 'stories/:storyId',
    title: 'סִפּוּרִים בְּהֶמְשֵׁכִים',
    loadComponent: () => import('./stories/story-page').then((m) => m.StoryPage),
  },
  {
    path: 'stories/:storyId/:chapterId',
    title: 'סִפּוּרִים בְּהֶמְשֵׁכִים',
    loadComponent: () => import('./stories/reader').then((m) => m.Reader),
  },
  {
    path: 'dressup',
    title: 'חֲדַר הַהַלְבָּשָׁה',
    loadComponent: () => import('./dressup/dressup').then((m) => m.Dressup),
  },
  {
    path: 'shop',
    title: 'הַחֲנוּת שֶׁל טִפִּי',
    loadComponent: () => import('./shop/shop').then((m) => m.Shop),
  },
  {
    path: 'album',
    title: 'אַלְבּוֹם הַמַּדְבֵּקוֹת',
    loadComponent: () => import('./album/album').then((m) => m.Album),
  },
  { path: '**', redirectTo: '' },
];
