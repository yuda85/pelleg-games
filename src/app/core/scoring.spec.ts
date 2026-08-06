import { starsFor } from './scoring';

describe('starsFor', () => {
  it('rewards a clean solve with three stars', () => {
    expect(starsFor(0)).toBe(3);
  });

  it('never drops below one star', () => {
    expect(starsFor(2)).toBe(2);
    expect(starsFor(9)).toBe(1);
  });
});
