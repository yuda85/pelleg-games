import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from '../icon';

/** One stepping stone on the map. Positioning is derived, not supplied. */
export interface MapNode {
  index: number;
  unlocked: boolean;
  stars: number;
  maxStars: number;
  /** The stone to step on next — gets a ring. */
  isNext: boolean;
}

interface PlacedNode extends MapNode {
  x: number;
  y: number;
}

/**
 * The brook. Sets are stepping stones along a stream that winds down the page —
 * a path reads as a journey in a way a list of levels never does.
 *
 * Node positions are percentages of the container and the stream is drawn in the
 * same 0-100 space, so the two stay aligned at every width and the layout still
 * works as a game's set count grows.
 */
@Component({
  selector: 'pg-stream-map',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Icon],
  templateUrl: './stream-map.html',
  styleUrl: './stream-map.scss',
})
export class StreamMap {
  readonly nodes = input.required<readonly MapNode[]>();
  /** Route prefix; a node links to `${routeBase}/${index}`. */
  readonly routeBase = input.required<string>();

  protected readonly placed = computed<PlacedNode[]>(() => {
    const list = this.nodes();
    return list.map((node, i) => ({
      ...node,
      // Physical percentages, matching the SVG. 72% is the right-hand side,
      // which is where a Hebrew reader starts.
      x: i % 2 === 0 ? 72 : 28,
      y: ((i + 0.5) / list.length) * 100,
    }));
  });

  /** Smooth stream through the nodes, in the same 0-100 space they sit in. */
  protected readonly stream = computed(() => {
    const points = this.placed();
    if (points.length === 0) return '';
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const node = points[i];
      const midY = (prev.y + node.y) / 2;
      d += ` C ${prev.x} ${midY}, ${node.x} ${midY}, ${node.x} ${node.y}`;
    }
    return d;
  });
}
