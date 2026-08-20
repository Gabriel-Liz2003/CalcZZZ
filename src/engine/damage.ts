import type { Attribute, CombatStats, DamageBreakdown, DefenseBreakdown, EnemyState } from './types';

// ZZZ attacker-side level coefficients, verified against the current community formula table.
// Index 0 = level 1. Current agent level cap is 60.
export const LEVEL_FACTORS = [
  50,54,58,62,66,71,76,82,88,94,
  100,107,114,121,129,137,145,153,162,172,
  181,191,201,211,222,233,245,256,268,281,
  293,306,319,333,347,361,375,390,405,421,
  436,452,469,485,502,519,537,555,573,592,
  610,629,649,669,689,709,730,751,772,794,
] as const;

export function levelFactorFor(attackerLevel: number): number {
  const finite = Number.isFinite(attackerLevel) ? attackerLevel : 60;
  const level = Math.min(60, Math.max(1, Math.trunc(finite)));
  return LEVEL_FACTORS[level - 1];
}

export function defenseBreakdown(
  stats: CombatStats,
  enemy: EnemyState,
  attackerLevel = 60,
): DefenseBreakdown {
  const baseDefense = Math.max(0, finiteOrZero(enemy.def));
  // In ZZZ, DEF Reduction and DEF Ignore are the same additive shred bucket.
  const combinedShred = clamp01(finiteOrZero(enemy.defReduction) + finiteOrZero(enemy.defIgnore));
  const afterDefReductionAndIgnore = baseDefense * (1 - combinedShred);
  // PEN Ratio is a separate multiplicative step after shred.
  const afterPenRatio = afterDefReductionAndIgnore * (1 - clamp01(finiteOrZero(stats.penRatio)));
  // Flat PEN is applied last; effective DEF cannot be negative.
  const afterFlatPen = Math.max(0, afterPenRatio - Math.max(0, finiteOrZero(stats.pen)));
  const levelFactor = levelFactorFor(attackerLevel);
  const multiplier = levelFactor / (levelFactor + afterFlatPen);
  return {
    baseDefense,
    combinedShred,
    afterDefReductionAndIgnore,
    afterPenRatio,
    afterFlatPen,
    levelFactor,
    multiplier,
  };
}

export function defenseMultiplier(stats: CombatStats, enemy: EnemyState, attackerLevel = 60): number {
  return defenseBreakdown(stats, enemy, attackerLevel).multiplier;
}

export function resistanceMultiplier(stats: CombatStats, enemy: EnemyState, attribute: Attribute): number {
  // ZZZ uses a linear RES bucket, unlike Genshin's piecewise RES curve.
  // Effective RES is capped at -100% on the lower end; damage cannot become negative at extreme positive RES.
  const raw = finiteOrZero(enemy.res[attribute]) - finiteOrZero(enemy.resReduction[attribute]) - finiteOrZero(stats.resIgnore);
  const effectiveRes = Math.max(-1, raw);
  return Math.max(0, 1 - effectiveRes);
}

export function calculateStandardDamage(input: {
  stats: CombatStats;
  enemy: EnemyState;
  skillMultiplier: number;
  attribute: Attribute;
  attackerLevel?: number;
  canCrit?: boolean;
  specialMultiplier?: number;
}): DamageBreakdown {
  const { stats, enemy, attribute } = input;
  const skillMultiplier = Math.max(0, finiteOrZero(input.skillMultiplier));
  const specialMultiplier = Math.max(0, finiteOrOne(input.specialMultiplier));
  const baseDamage = Math.max(0, finiteOrZero(stats.atk)) * skillMultiplier;
  const dmgBonusMultiplier = Math.max(0, 1 + finiteOrZero(stats.dmgBonus));
  const defense = defenseBreakdown(stats, enemy, input.attackerLevel ?? 60);
  const resMultiplier = resistanceMultiplier(stats, enemy, attribute);
  const vulnerabilityMultiplier = Math.max(0, 1 + finiteOrZero(enemy.dmgTaken));
  const stunMultiplier = enemy.stunned ? Math.max(0, finiteOrOne(enemy.stunMultiplier)) : 1;
  const common = baseDamage * dmgBonusMultiplier * defense.multiplier * resMultiplier * vulnerabilityMultiplier * stunMultiplier * specialMultiplier;
  const critRate = input.canCrit === false ? 0 : clamp01(finiteOrZero(stats.critRate));
  const critMultiplier = 1 + Math.max(0, finiteOrZero(stats.critDmg));
  const nonCrit = finiteDamage(common);
  const crit = finiteDamage(common * critMultiplier);
  const expected = finiteDamage(nonCrit * (1 - critRate) + crit * critRate);
  return {
    baseDamage,
    skillMultiplier,
    dmgBonusMultiplier,
    critMultiplier,
    defMultiplier: defense.multiplier,
    defense,
    resMultiplier,
    vulnerabilityMultiplier,
    stunMultiplier,
    specialMultiplier,
    nonCrit,
    crit,
    expected,
  };
}

export function expectedCritContribution(breakdown: DamageBreakdown, critRate: number): number {
  const rate = clamp01(finiteOrZero(critRate));
  return finiteDamage((breakdown.crit - breakdown.nonCrit) * rate);
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function finiteOrZero(value: number | undefined): number {
  return value != null && Number.isFinite(value) ? value : 0;
}

function finiteOrOne(value: number | undefined): number {
  return value != null && Number.isFinite(value) ? value : 1;
}

function finiteDamage(value: number): number {
  return Number.isFinite(value) && value >= 0 ? value : 0;
}
