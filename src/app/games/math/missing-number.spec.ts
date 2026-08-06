import { TestBed } from '@angular/core/testing';
import { MissingNumber } from './missing-number';
import { buildRun, type Rng } from './math-engine';

function seededRng(seed = 1): Rng {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

async function render(chill: boolean) {
  TestBed.configureTestingModule({});
  const boards = buildRun(0, {}, seededRng(11)).bonus;
  const fixture = TestBed.createComponent(MissingNumber);
  fixture.componentRef.setInput('boards', boards);
  fixture.componentRef.setInput('chill', chill);
  await fixture.whenStable();
  return { fixture, boards, el: fixture.nativeElement as HTMLElement };
}

function clickAnswer(el: HTMLElement, answer: number): void {
  [...el.querySelectorAll<HTMLElement>('.stone')]
    .find((s) => Number(s.dataset['value']) === answer)!
    .click();
}

describe('MissingNumber', () => {
  it('shows a clock when chill mode is off', async () => {
    const { el } = await render(false);
    expect(el.querySelector('.clock')).not.toBeNull();
  });

  it('hides the clock entirely in chill mode', async () => {
    const { el } = await render(true);
    expect(el.querySelector('.clock')).toBeNull();
  });

  it('advances through the questions as they are answered', async () => {
    const { fixture, boards, el } = await render(true);
    expect(el.querySelector('.deep__count')?.textContent).toContain('1');
    clickAnswer(el, boards[0].answer);
    await fixture.whenStable();
    expect(el.querySelector('.deep__count')?.textContent).toContain('2');
  });

  it('emits a tally once every question is done', async () => {
    const { fixture, boards, el } = await render(true);
    let result: { correct: number } | null = null;
    fixture.componentInstance.done.subscribe((r) => (result = r));
    for (const board of boards) {
      clickAnswer(el, board.answer);
      await fixture.whenStable();
    }
    expect(result!.correct).toBe(boards.length);
  });
});
