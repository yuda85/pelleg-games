import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MathPlay } from './math-play';
import { Progress } from '../../core/progress';

async function render(setIndex = 0) {
  TestBed.configureTestingModule({ providers: [provideRouter([])] });
  const fixture = TestBed.createComponent(MathPlay);
  fixture.componentRef.setInput('setIndex', setIndex);
  await fixture.whenStable();
  return { fixture, el: fixture.nativeElement as HTMLElement, progress: TestBed.inject(Progress) };
}

describe('MathPlay', () => {
  it('deals a run and shows its first question', async () => {
    const { el } = await render();
    expect(el.querySelector('.prompt')?.textContent?.trim()).toMatch(/[-+×:−]/);
    expect(el.querySelectorAll('.stone').length).toBeGreaterThan(0);
  });

  /**
   * Regression: `run` used to read `progress.opStats()`, which `recordOp` writes
   * on every answer — so answering one question silently regenerated all the
   * questions after it. A run must be fixed once dealt.
   */
  it('does not regenerate the run when operation stats change mid-run', async () => {
    const { fixture, el, progress } = await render();
    const before = el.querySelector('.prompt')!.textContent!.trim();

    progress.recordOp('div', false);
    progress.recordOp('div', false);
    progress.recordOp('mul', true);
    await fixture.whenStable();

    expect(el.querySelector('.prompt')!.textContent!.trim()).toBe(before);
  });

  it('shows one pip per question in the set, plus the bonus pip', async () => {
    const { el } = await render();
    expect(el.querySelectorAll('.pip').length).toBe(8);
  });
});
