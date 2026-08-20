import type { CombatStats, Effect, EffectContext, EnemyState, TimedEffect } from './types';

export function isEffectActive(timed: TimedEffect, now: number, ctx: EffectContext): boolean {
  if (timed.effect.condition && !timed.effect.condition(ctx)) return false;
  if (timed.effect.duration == null) return true;
  return now < timed.startedAt + timed.effect.duration;
}

export function applyEffects(
  baseStats: CombatStats,
  baseEnemy: EnemyState,
  effects: TimedEffect[],
  ctx: EffectContext,
): { stats: CombatStats; enemy: EnemyState; active: TimedEffect[] } {
  const stats = { ...baseStats };
  const enemy = { ...baseEnemy };
  const active = effects.filter((effect) => isEffectActive(effect, ctx.time, ctx));

  for (const timed of active) {
    const { effect } = timed;
    const value = effect.value * timed.stacks;
    const targetMatches =
      effect.target === 'team' ||
      effect.target === 'active_character' ||
      (effect.target === 'self' && timed.sourceAgentId === ctx.activeAgentId);

    if (effect.target === 'enemy') {
      if (effect.stat === 'resReduction') enemy.resReduction += value;
      if (effect.stat === 'defReduction') enemy.defReduction += value;
      if (effect.stat === 'stunMultiplier') enemy.stunMultiplier += value;
      continue;
    }

    if (!targetMatches) continue;
    if (effect.stat === 'atk') stats.atk += value;
    if (effect.stat === 'critRate') stats.critRate += value;
    if (effect.stat === 'critDmg') stats.critDmg += value;
    if (effect.stat === 'dmgBonus') stats.dmgBonus += value;
  }

  return { stats, enemy, active };
}

export function activateEffect(effect: Effect, sourceAgentId: string, time: number, stacks = 1): TimedEffect {
  return {
    effect,
    sourceAgentId,
    startedAt: time,
    stacks: Math.min(stacks, effect.maxStacks ?? stacks),
  };
}
