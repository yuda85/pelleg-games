import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { StreamMap, type MapNode } from './stream-map';

function nodes(count: number): MapNode[] {
  return Array.from({ length: count }, (_, index) => ({
    index,
    unlocked: index === 0,
    stars: 0,
    maxStars: 21,
    isNext: index === 0,
  }));
}

async function render(count: number, routeBase = '/nikud') {
  const fixture = TestBed.createComponent(StreamMap);
  fixture.componentRef.setInput('nodes', nodes(count));
  fixture.componentRef.setInput('routeBase', routeBase);
  await fixture.whenStable();
  return fixture;
}

describe('StreamMap', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter([])] }));

  it('alternates node sides so the path zigzags, starting on the right', async () => {
    const fixture = await render(4);
    const positions = [...fixture.nativeElement.querySelectorAll('.node')].map(
      (li: HTMLElement) => li.style.left,
    );
    expect(positions).toEqual(['72%', '28%', '72%', '28%']);
  });

  it('draws the stream through every node, in the same coordinate space', async () => {
    const fixture = await render(3);
    const d: string = fixture.nativeElement.querySelector('.stream__water').getAttribute('d');
    expect(d.startsWith('M 72 16.6')).toBe(true);
    expect(d).toContain('28');
  });

  it('locks a node that is not unlocked and links one that is', async () => {
    const fixture = await render(2, '/math');
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('a.node__btn')?.getAttribute('href')).toBe('/math/0');
    expect(el.querySelectorAll('.node__btn--locked').length).toBe(1);
  });
});
