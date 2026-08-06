import { TestBed } from '@angular/core/testing';
import { Keypad } from './keypad';
import { buildBoard, generateQuestion, type Rng } from './math-engine';

function seededRng(seed = 1): Rng {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

async function render() {
  TestBed.configureTestingModule({});
  const rng = seededRng(5);
  const board = buildBoard(generateQuestion(0, 'add', 'result', rng), 0, rng);
  const fixture = TestBed.createComponent(Keypad);
  fixture.componentRef.setInput('board', board);
  await fixture.whenStable();
  return { fixture, board, el: fixture.nativeElement as HTMLElement };
}

function press(el: HTMLElement, label: string): void {
  const key = [...el.querySelectorAll<HTMLElement>('.key')].find(
    (k) => k.textContent?.trim() === label,
  );
  key!.click();
}

describe('Keypad', () => {
  it('builds the entry digit by digit', async () => {
    const { fixture, el } = await render();
    press(el, '4');
    press(el, '2');
    await fixture.whenStable();
    expect(el.querySelector('.entry')?.textContent?.trim()).toBe('42');
  });

  it('deletes the last digit', async () => {
    const { fixture, el } = await render();
    press(el, '4');
    press(el, '2');
    el.querySelector<HTMLElement>('.key--back')!.click();
    await fixture.whenStable();
    expect(el.querySelector('.entry')?.textContent?.trim()).toBe('4');
  });

  it('emits when the typed answer is right', async () => {
    const { fixture, el, board } = await render();
    let result: unknown = null;
    fixture.componentInstance.solved.subscribe((r) => (result = r));
    for (const digit of String(board.answer)) press(el, digit);
    el.querySelector<HTMLElement>('.key--ok')!.click();
    await fixture.whenStable();
    expect(result).toEqual({ mistakes: 0, hints: 0 });
  });

  it('clears and counts a mistake on a wrong answer', async () => {
    const { fixture, el, board } = await render();
    for (const digit of String(board.answer + 1)) press(el, digit);
    el.querySelector<HTMLElement>('.key--ok')!.click();
    await fixture.whenStable();
    expect(el.querySelector('.entry')?.textContent?.trim()).toBe('');
  });

  it('surrenders to the stone board after three wrong attempts', async () => {
    const { fixture, el, board } = await render();
    let gaveUp: number | null = null;
    fixture.componentInstance.surrender.subscribe((n) => (gaveUp = n));
    for (let attempt = 0; attempt < 3; attempt++) {
      for (const digit of String(board.answer + 1)) press(el, digit);
      el.querySelector<HTMLElement>('.key--ok')!.click();
      await fixture.whenStable();
    }
    expect(gaveUp).toBe(3);
  });
});
