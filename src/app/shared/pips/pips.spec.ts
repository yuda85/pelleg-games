import { TestBed } from '@angular/core/testing';
import { Pips } from './pips';

async function render(inputs: Record<string, unknown>) {
  const fixture = TestBed.createComponent(Pips);
  for (const [key, value] of Object.entries(inputs)) fixture.componentRef.setInput(key, value);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

describe('Pips', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('renders one pip per question plus the bonus pip', async () => {
    const el = await render({ total: 7, done: 0, current: 0, scores: [], bonusDone: false });
    expect(el.querySelectorAll('.pip').length).toBe(8);
  });

  it('fills only the questions already banked', async () => {
    const el = await render({ total: 7, done: 2, current: 2, scores: [3, 2], bonusDone: false });
    expect(el.querySelectorAll('.pip--done').length).toBe(2);
  });

  it('shows the score inside a completed pip', async () => {
    const el = await render({ total: 7, done: 1, current: 1, scores: [3], bonusDone: false });
    expect(el.querySelector('.pip--done')?.textContent?.trim()).toBe('3');
  });

  it('rings the current question only while it is unanswered', async () => {
    const el = await render({ total: 7, done: 1, current: 1, scores: [3], bonusDone: false });
    expect(el.querySelectorAll('.pip--now').length).toBe(1);
  });

  it('fills the bonus pip when the bonus is finished', async () => {
    const el = await render({ total: 7, done: 7, current: 7, scores: [], bonusDone: true });
    expect(el.querySelector('.pip--bonus')?.classList.contains('pip--done')).toBe(true);
  });
});
