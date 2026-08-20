import type { Attribute, CombatStats, DamageBreakdown, EnemyState } from './types';

export const ATTACKER_LEVEL_FACTOR_60 = 794;

export function defenseMultiplier(stats: CombatStats, enemy: EnemyState, attackerLevelFactor = ATTACKER_LEVEL_FACTOR_60): number {
  const defenseAfterReduction = Math.max(0, enemy.def * Math.max(0, 1 - enemy.defReduction));
  const defenseAfterIgnore = defenseAfterReduction * Math.max(0, 1 - enemy.defIgnore);
  const defenseAfterPenRatio = defenseAfterIgnore * Math.max(0, 1 - stats.penRatio);
  const effectiveDefense = Math.max(0, defenseAfterPenRatio - stats.pen);
  return attackerLevelFactor / (attackerLevelFactor + effectiveDefense);
}

export function resistanceMultiplier(stats: CombatStats, enemy: EnemyState, attribute: Attribute): number {
  const effectiveRes = (enemy.res[attribute] ?? 0) - (enemy.resReduction[attribute] ?? 0) - stats.resIgnore;
  if (effectiveRes < 0) return 1 - effectiveRes / 2;
  if (effectiveRes < 0.75) return 1 - effectiveRes;
  return 1 / (1 + 5 * effectiveRes);
}

export function calculateStandardDamage(input: {
  stats: CombatStats;
  enemy: EnemyState;
  skillMultiplier: number;
  attribute: Attribute;
  canCrit?: boolean;
  specialMultiplier?: number;
}): DamageBreakdown {
  const { stats, enemy, skillMultiplier, attribute } = input;
  const specialMultiplier = input.specialMultiplier ?? 1;
  const baseDamage = stats.atk * skillMultiplier;
  const dmgBonusMultiplier = Math.max(0, 1 + stats.dmgBonus);
  const defMultiplier = defenseMultiplier(stats, enemy);
  const resMultiplier = resistanceMultiplier(stats, enemy, attribute);
  const vulnerabilityMultiplier = Math.max(0, 1 + enemy.dmgTaken);
  const stunMultiplier = enemy.stunned ? enemy.stunMultiplier : 1;
  const common = baseDamage * dmgBonusMultiplier * defMultiplier * resMultiplier * vulnerabilityMultiplier * stunMultiplier * specialMultiplier;
  const critRate = input.canCrit === false ? 0 : Math.min(1, Math.max(0, stats.critRate));
  const critMultiplier = 1 + Math.max(0, stats.critDmg);
  const nonCrit = common;
  const crit = common * critMultiplier;
  const expected = nonCrit * (1 - critRate) + crit * critRate;
  return { baseDamage, skillMultiplier, dmgBonusMultiplier, critMultiplier, defMultiplier, resMultiplier, vulnerabilityMultiplier, stunMultiplier, specialMultiplier, nonCrit, crit, expected };
}

export function expectedCritContribution(breakdown: DamageBreakdown, critRate: number): number {
  const rate = Math.min(1, Math.max(0, critRate));
  return (breakdown.crit - breakdown.nonCrit) * rate;
}
