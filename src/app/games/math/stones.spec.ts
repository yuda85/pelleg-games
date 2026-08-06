import { TestBed } from '@angular/core/testing';
import { Stones } from './stones';
import { buildBoard, generateQuestion, type Rng } from './math-engine';

function seededRng(seed = 1): Rng {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

async function render(initialMistakes = 0) {
  TestBed.configureTestingModule({});
  const rng = seededRng(3);
  const board = buildBoard(generateQuestion(0, 'mul', 'result', rng), 0, rng);
  const fixture = TestBed.createComponent(Stones);
  fixture.componentRef.setInput('board', board);
  fixture.componentRef.setInput('initialMistakes', initialMistakes);
  await fixture.whenStable();
  return { fixture, board, el: fixture.nativeElement as HTMLElement };
}

function stoneWith(el: HTMLElement, predicate: (value: number) => boolean): HTMLElement {
  return [...el.querySelectorAll<HTMLElement>('.stone')].find((s) =>
    predicate(Number(s.dataset['value'])),
  )!;
}

describe('Stones', () => {
  it('renders one stone per candidate', async () => {
    const { el, board } = await render();
    expect(el.querySelectorAll('.stone').length).toBe(board.stones.length);
  });

  it('writes the prompt with the right operator sign', async () => {
    const { el, board } = await render();
    expect(el.querySelector('.prompt')?.textContent).toContain(String(board.question.a));
    expect(el.querySelector('.prompt')?.textContent).toContain('×');
  });

  it('emits when the correct stone is chosen, with no mistakes', async () => {
    const { fixture, el, board } = await render();
    let result: unknown = null;
    fixture.componentInstance.solved.subscribe((r) => (result = r));
    stoneWith(el, (v) => v === board.answer).click();
    await fixture.whenStable();
    expect(result).toEqual({ mistakes: 0, hints: 0 });
  });

  it('counts a wrong stone and does not finish the question', async () => {
    const { fixture, el, board } = await render();
    let result: unknown = null;
    fixture.componentInstance.solved.subscribe((r) => (result = r));
    stoneWith(el, (v) => v !== board.answer).click();
    await fixture.whenStable();
    expect(result).toBeNull();
    expect(el.querySelectorAll('.stone--sunk').length).toBe(1);
  });

  it('sinks a wrong stone when the hint is used', async () => {
    const { fixture, el } = await render();
    el.querySelector<HTMLElement>('.stones__hint')!.click();
    await fixture.whenStable();
    expect(el.querySelectorAll('.stone--sunk').length).toBe(1);
  });

  it('carries mistakes handed over by a surrendered boss', async () => {
    const { fixture, el, board } = await render(3);
    let result: unknown = null;
    fixture.componentInstance.solved.subscribe((r) => (result = r));
    stoneWith(el, (v) => v === board.answer).click();
    await fixture.whenStable();
    // 3 mistakes → one star, exactly as if they had been made here.
    expect(result).toEqual({ mistakes: 3, hints: 0 });
  });
});
