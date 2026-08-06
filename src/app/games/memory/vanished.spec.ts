import { TestBed } from '@angular/core/testing';
import { Vanished } from './vanished';
import { buildVanishRounds } from './memory-engine';
import type { Rng } from '../../core/hebrew';

function seededRng(seed = 1): Rng {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function render() {
  TestBed.configureTestingModule({});
  const rounds = buildVanishRounds(seededRng(6));
  const fixture = TestBed.createComponent(Vanished);
  fixture.componentRef.setInput('rounds', rounds);
  await fixture.whenStable();
  return { fixture, rounds, el: fixture.nativeElement as HTMLElement };
}

describe('Vanished', () => {
  it('shows all five words while she studies them', async () => {
    const { el } = await render();
    expect(el.querySelectorAll('.word').length).toBe(5);
    expect(el.querySelectorAll('.pick').length).toBe(0);
  });

  it('takes one away and offers the choices once studying ends', async () => {
    const { fixture, el } = await render();
    await wait(3400);
    await fixture.whenStable();
    expect(el.querySelectorAll('.word--stay').length).toBe(4);
    expect(el.querySelectorAll('.word--gap').length).toBe(1);
    expect(el.querySelectorAll('.pick').length).toBe(5);
  }, 10000);

  it('reveals the right answer however she answered', async () => {
    const { fixture, el, rounds } = await render();
    await wait(3400);
    await fixture.whenStable();

    const wrong = [...el.querySelectorAll<HTMLElement>('.pick')].find(
      (p) => p.textContent?.trim() !== rounds[0].missing,
    )!;
    wrong.click();
    await fixture.whenStable();

    const answer = el.querySelector('.pick--answer');
    expect(answer?.textContent?.trim()).toBe(rounds[0].missing);
  }, 10000);
});
