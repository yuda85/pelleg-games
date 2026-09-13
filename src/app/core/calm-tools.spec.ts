import { CALM_TOOLS, CALM_TOOL_IDS, isCalmToolId } from './calm-tools';

describe('the calm tools', () => {
  it('has every tool reachable by its own id', () => {
    for (const id of CALM_TOOL_IDS) {
      expect(CALM_TOOLS[id].id).toBe(id);
      expect(isCalmToolId(id)).toBe(true);
    }
  });

  it('rejects a name that is not a tool', () => {
    expect(isCalmToolId('breathing-exercise')).toBe(false);
    expect(isCalmToolId(undefined)).toBe(false);
  });

  it('keeps every tool inside the 30-60 second window', () => {
    for (const id of CALM_TOOL_IDS) {
      expect(CALM_TOOLS[id].seconds).toBeGreaterThanOrEqual(30);
      expect(CALM_TOOLS[id].seconds).toBeLessThanOrEqual(60);
    }
  });

  it('gives every tool the words it needs for its own mode', () => {
    for (const id of CALM_TOOL_IDS) {
      const tool = CALM_TOOLS[id];
      expect(tool.name.trim()).not.toBe('');
      expect(tool.intro.trim()).not.toBe('');
      expect(tool.outro.trim()).not.toBe('');
      if (tool.mode === 'steps' || tool.mode === 'breathe' || tool.mode === 'pulse') {
        expect(tool.steps?.length ?? 0).toBeGreaterThan(0);
      }
      if (tool.mode === 'pick') expect(tool.options?.length ?? 0).toBeGreaterThan(0);
      if (tool.mode === 'hold') expect(tool.holds?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it('offers a short first option wherever a length is chosen', () => {
    for (const id of CALM_TOOL_IDS) {
      const holds = CALM_TOOLS[id].holds;
      // Nobody should have to start at the longest one.
      if (holds) expect(Math.min(...holds)).toBeLessThanOrEqual(10);
    }
  });
});
