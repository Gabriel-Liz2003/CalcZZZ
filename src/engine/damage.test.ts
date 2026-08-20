import { describe, expect, it } from 'vitest';
import { calculateAnomalyDamage, calculateStandardDamage, defMultiplier } from './damage';
import { activateEffect, applyEffects, isEffectActive } from './effects';
import { dialyn, dialynAdditionalAbility, trainingAttacker } from '../data/agents';
import type { EnemyState } from './types';

const enemy: EnemyState = {
  def: 794,
  res: 0.1,
  resReduction: 0,
  defReduction: 0,
  defIgnore: 0,
  dmgTaken: 0,
  stunned: false,
  stunMultiplier: 1.5,
};

describe('damage engine', () => {
  it('calculates expected crit damage from non-crit and crit outcomes', () => {
    const stats = { ...trainingAttacker.stats, critRate: 0.5, critDmg: 1 };
    const result = calculateStandardDamage(stats, enemy, 1);
    expect(result.expected).toBeCloseTo((result.nonCrit + result.crit) / 2, 8);
  });

  it('caps crit rate at 100%', () => {
    const stats = { ...trainingAttacker.stats, critRate: 5 };
    const result = calculateStandardDamage(stats, enemy, 1);
    expect(result.expected).toBeCloseTo(result.crit, 8);
  });

  it('applies PEN Ratio and flat PEN to DEF', () => {
    const base = defMultiplier(trainingAttacker.stats, enemy);
    const penetrated = defMultiplier({ ...trainingAttacker.stats, penRatio: 0.2, pen: 100 }, enemy);
    expect(penetrated).toBeGreaterThan(base);
  });

  it('applies RES reduction and stunned multiplier', () => {
    const base = calculateStandardDamage(trainingAttacker.stats, enemy, 1).expected;
    const boosted = calculateStandardDamage(trainingAttacker.stats, { ...enemy, resReduction: 0.2, stunned: true }, 1).expected;
    expect(boosted).toBeGreaterThan(base);
  });

  it('scales anomaly damage with anomaly proficiency', () => {
    const low = calculateAnomalyDamage({ ...trainingAttacker.stats, anomalyProficiency: 100 }, enemy, 7.13);
    const high = calculateAnomalyDamage({ ...trainingAttacker.stats, anomalyProficiency: 200 }, enemy, 7.13);
    expect(high).toBeCloseTo(low * 2, 8);
  });
});

describe('effect engine', () => {
  it('activates Dialyn team buff only with Attack or Rupture teammate', () => {
    const timed = activateEffect(dialynAdditionalAbility, dialyn.id, 0);
    const validCtx = { activeAgentId: dialyn.id, team: [dialyn, trainingAttacker], time: 1 };
    expect(isEffectActive(timed, 1, validCtx)).toBe(true);
    expect(isEffectActive(timed, 16, { ...validCtx, time: 16 })).toBe(false);
  });

  it('applies the 40% team DMG bonus while the timed buff is active', () => {
    const timed = activateEffect(dialynAdditionalAbility, dialyn.id, 0);
    const ctx = { activeAgentId: trainingAttacker.id, team: [dialyn, trainingAttacker], time: 5 };
    const state = applyEffects(trainingAttacker.stats, enemy, [timed], ctx);
    expect(state.stats.dmgBonus).toBeCloseTo(trainingAttacker.stats.dmgBonus + 0.4, 8);
  });
});
