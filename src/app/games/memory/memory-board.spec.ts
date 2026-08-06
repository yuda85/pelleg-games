import { TestBed } from '@angular/core/testing';
import { MemoryBoardView } from './memory-board';
import { buildBoard } from './memory-engine';
import type { Rng } from '../../core/hebrew';

function seededRng(seed = 1): Rng {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

async function render() {
  TestBed.configureTestingModule({});
  const board = buildBoard(0, 0, seededRng(3));
  const fixture = TestBed.createComponent(MemoryBoardView);
  fixture.componentRef.setInput('board', board);
  await fixture.whenStable();
  return { fixture, board, el: fixture.nativeElement as HTMLElement };
}

function shellAt(el: HTMLElement, index: number): HTMLElement {
  return el.querySelectorAll<HTMLElement>('.shell')[index];
}

describe('MemoryBoardView', () => {
  it('deals one shell per card, all closed', async () => {
    const { el, board } = await render();
    expect(el.querySelectorAll('.shell').length).toBe(board.cards.length);
    expect(el.querySelectorAll('.shell--open').length).toBe(0);
  });

  it('opens a shell when it is tapped', async () => {
    const { fixture, el } = await render();
    shellAt(el, 0).click();
    await fixture.whenStable();
    expect(el.querySelectorAll('.shell--open').length).toBe(1);
  });

  it('keeps a matching pair open and counts no mistake', async () => {
    const { fixture, el, board } = await render();
    const first = board.cards[0];
    const partnerIndex = board.cards.findIndex(
      (c) => c.pairId === first.pairId && c.id !== first.id,
    );
    shellAt(el, 0).click();
    await fixture.whenStable();
    shellAt(el, partnerIndex).click();
    await fixture.whenStable();
    expect(el.querySelectorAll('.shell--matched').length).toBe(2);
  });

  it('marks a mismatched pair wrong rather than hiding it instantly', async () => {
    const { fixture, el, board } = await render();
    const first = board.cards[0];
    const strangerIndex = board.cards.findIndex((c) => c.pairId !== first.pairId);
    shellAt(el, 0).click();
    await fixture.whenStable();
    shellAt(el, strangerIndex).click();
    await fixture.whenStable();
    expect(el.querySelectorAll('.shell--wrong').length).toBe(2);
    expect(el.querySelectorAll('.shell--matched').length).toBe(0);
  });

  it('opens a whole pair when the hint is used', async () => {
    const { fixture, el } = await render();
    el.querySelector<HTMLElement>('.memory__hint')!.click();
    await fixture.whenStable();
    expect(el.querySelectorAll('.shell--open').length).toBe(2);
  });

  it('emits once every pair is found, reporting the mistakes', async () => {
    const { fixture, el, board } = await render();
    let result: { mistakes: number; hints: number } | null = null;
    fixture.componentInstance.solved.subscribe((r) => (result = r));

    const seen = new Set<string>();
    for (const card of board.cards) {
      if (seen.has(card.pairId)) continue;
      seen.add(card.pairId);
      const a = board.cards.findIndex((c) => c.id === card.id);
      const b = board.cards.findIndex((c) => c.pairId === card.pairId && c.id !== card.id);
      shellAt(el, a).click();
      await fixture.whenStable();
      shellAt(el, b).click();
      await fixture.whenStable();
    }

    expect(result).toEqual({ mistakes: 0, hints: 0 });
  });
});
