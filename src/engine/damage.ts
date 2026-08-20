import type { CombatStats, DamageBreakdown, EnemyState } from './types';

const LEVEL_FACTOR_60 = 794;

export function defMultiplier(stats: CombatStats, enemy: EnemyState, levelFactor = LEVEL_FACTOR_60): number {
  const effectiveDef = Math.max(
    enemy.def * (1 - enemy.defReduction) * (1 - stats.penRatio) * (1 - enemy.defIgnore) - stats.pen,
    0,
  );
  return levelFactor / (effectiveDef + levelFactor);
}

export function resMultiplier(stats: CombatStats, enemy: EnemyState): number {
  return 1 - enemy.res + enemy.resReduction + stats.resIgnore;
}

export function calculateStandardDamage(
  stats: CombatStats,
  enemy: EnemyState,
  skillMultiplier: number,
): DamageBreakdown {
  const baseDamage = stats.atk * skillMultiplier;
  const dmgBonusMultiplier = 1 + stats.dmgBonus;
  const defense = defMultiplier(stats, enemy);
  const resistance = resMultiplier(stats, enemy);
  const dmgTakenMultiplier = 1 + enemy.dmgTaken;
  const stun = enemy.stunned ? enemy.stunMultiplier : 1;
  const common = baseDamage * dmgBonusMultiplier * defense * resistance * dmgTakenMultiplier * stun;
  const nonCrit = common;
  const crit = common * (1 + stats.critDmg);
  const critRate = Math.min(Math.max(stats.critRate, 0), 1);
  const expected = nonCrit * (1 - critRate) + crit * critRate;

  return {
    baseDamage,
    dmgBonusMultiplier,
    defMultiplier: defense,
    resMultiplier: resistance,
    dmgTakenMultiplier,
    stunMultiplier: stun,
    nonCrit,
    crit,
    expected,
  };
}

export function calculateAnomalyDamage(
  stats: CombatStats,
  enemy: EnemyState,
  anomalyMultiplier: number,
  anomalyLevelMultiplier = 1,
): number {
  const ap = (stats.anomalyProficiency ?? 100) / 100;
  const base = stats.atk * anomalyMultiplier;
  return (
    base *
    ap *
    anomalyLevelMultiplier *
    (1 + stats.dmgBonus) *
    defMultiplier(stats, enemy) *
    resMultiplier(stats, enemy) *
    (1 + enemy.dmgTaken) *
    (enemy.stunned ? enemy.stunMultiplier : 1)
  );
}
