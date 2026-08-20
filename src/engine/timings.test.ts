import { describe, expect, it } from 'vitest';
import { enrichAgentTimingsFromZSim, estimatedTiming, parseCsv } from './timings';

const skill = {
  id: 'ultimate',
  category: 'Ultimate',
  hits: [{ damageMultiplier: { '12': 45.247 } }, { damageMultiplier: { '12': 1 } }],
};

describe('skill timing enrichment', () => {
  it('always produces a finite estimated duration and one timestamp per hit', () => {
    const timing = estimatedTiming(skill);
    expect(timing.duration).toBeGreaterThan(0);
    expect(timing.hitTimings).toHaveLength(2);
    expect(timing.hitTimings.every(Number.isFinite)).toBe(true);
    expect(timing.meta.confidence).toBe('estimated');
    expect(timing.meta.verified).toBe(false);
  });

  it('parses quoted CSV cells', () => {
    const rows = parseCsv('CID,CN_TriggerLevel,skill_tag,D_LEVEL12,ticks,tick_list\n1401,终结技,1401_Q,45.247,159,"[4,17]"\n');
    expect(rows).toHaveLength(1);
    expect(rows[0].ticks).toBe('159');
    expect(rows[0].tick_list).toBe('[4,17]');
  });

  it('matches ZSim rows by CID, category and level-12 multiplier', () => {
    const csv = 'CID,CN_TriggerLevel,skill_tag,D_LEVEL12,ticks,tick_list\n1401,终结技,1401_Q,45.247,159,"[4,17]"\n';
    const result = enrichAgentTimingsFromZSim({ id: 'alice', gameId: '1401', skills: { ultimate: skill } }, csv);
    expect(result.ultimate.duration).toBeCloseTo(159 / 60);
    expect(result.ultimate.hitTimings).toEqual([4 / 60, 17 / 60].map((value) => Math.round(value * 10000) / 10000));
    expect(result.ultimate.meta.confidence).toBe('zsim');
    expect(result.ultimate.meta.verified).toBe(true);
  });

  it('does not fabricate a ZSim match when the multiplier differs too much', () => {
    const csv = 'CID,CN_TriggerLevel,skill_tag,D_LEVEL12,ticks,tick_list\n1401,终结技,1401_Q,3,159,"[4,17]"\n';
    const result = enrichAgentTimingsFromZSim({ id: 'alice', gameId: '1401', skills: { ultimate: skill } }, csv);
    expect(result.ultimate).toBeUndefined();
  });
});
