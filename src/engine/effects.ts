import { evaluateCondition } from './conditions';
import type { ActiveEffect, CombatState, CombatStats, EffectContext, EffectDefinition, EnemyState, StatKey, Trigger } from './types';

function targetMatches(effect: ActiveEffect, state: CombatState, targetAgentId: string): boolean {
  const def = effect.definition;
  if (def.target === 'TEAM') return true;
  if (def.target === 'ACTIVE_CHARACTER') return state.activeCharacterId === targetAgentId;
  if (def.target === 'SELF') return effect.sourceCharacterId === targetAgentId;
  if (def.target === 'SPECIFIC_CHARACTER') return def.specificCharacterId === targetAgentId;
  return false;
}

export function pruneExpiredEffects(state: CombatState): ActiveEffect[] {
  return state.activeEffects.filter((effect) => effect.expiresAt == null || effect.expiresAt > state.currentTime);
}

export function triggerEffects(state: CombatState, definitions: EffectDefinition[], sourceCharacterId: string, trigger: Trigger): { state: CombatState; activated: ActiveEffect[] } {
  let activeEffects = pruneExpiredEffects(state);
  const activated: ActiveEffect[] = [];
  const context: EffectContext = { state: { ...state, activeEffects }, sourceAgentId: sourceCharacterId };

  for (const definition of definitions) {
    if (definition.trigger !== trigger && definition.trigger !== 'always') continue;
    if (!evaluateCondition(definition.condition, context)) continue;
    const existingIndex = activeEffects.findIndex((item) => item.definition.id === definition.id && item.sourceCharacterId === sourceCharacterId);
    const existing = existingIndex >= 0 ? activeEffects[existingIndex] : undefined;
    const cooldownKey = `${definition.id}:${sourceCharacterId}`;
    const lastTrigger = state.effectTriggerTimes[cooldownKey];
    // Cooldown is checked from trigger history, not from whether the previous buff still exists.
    if (definition.cooldown && lastTrigger != null && state.currentTime - lastTrigger < definition.cooldown) continue;

    const gained = Math.max(1, definition.stacksPerTrigger ?? 1);
    const maxStacks = Math.max(1, definition.maxStacks ?? 1);
    const nextStacks = Math.min(maxStacks, (existing?.stacks ?? 0) + gained);
    const duration = definition.duration;
    let expiresAt = duration == null ? undefined : state.currentTime + Math.max(0, duration);
    if (existing && duration != null) {
      const policy = definition.reapply ?? 'refresh';
      if (policy === 'ignore') continue;
      if (policy === 'extend') {
        const extension = Math.max(0, definition.extendBy ?? duration);
        const currentExpiry = existing.expiresAt ?? state.currentTime;
        const uncapped = currentExpiry + extension;
        expiresAt = definition.maxDuration == null
          ? uncapped
          : Math.min(uncapped, state.currentTime + Math.max(0, definition.maxDuration));
      }
      if (policy === 'replace' || policy === 'refresh') expiresAt = state.currentTime + Math.max(0, duration);
    }

    const active: ActiveEffect = {
      key: `${definition.id}:${sourceCharacterId}`,
      definition,
      sourceCharacterId,
      startedAt: existing && (definition.reapply ?? 'refresh') !== 'replace' ? existing.startedAt : state.currentTime,
      expiresAt,
      stacks: nextStacks,
      lastTriggeredAt: state.currentTime,
      snapshotStats: existing?.snapshotStats,
    };
    if (existingIndex >= 0) activeEffects = activeEffects.map((item, index) => index === existingIndex ? active : item);
    else activeEffects = [...activeEffects, active];
    activated.push(active);
  }

  const effectTriggerTimes = { ...state.effectTriggerTimes };
  for (const item of activated) effectTriggerTimes[item.key] = state.currentTime;
  return { state: { ...state, activeEffects, triggerTimes: { ...state.triggerTimes, [trigger]: state.currentTime }, effectTriggerTimes }, activated };
}

function applyStat(stats: CombatStats, stat: StatKey, value: number, mode: 'add' | 'multiply' | 'override'): void {
  if (!(stat in stats)) return;
  const key = stat as keyof CombatStats;
  const current = typeof stats[key] === 'number' && Number.isFinite(stats[key]) ? stats[key] : 0;
  if (mode === 'override') stats[key] = value;
  else if (mode === 'multiply') stats[key] = current * value;
  else stats[key] = current + value;
}

export function applyActiveEffects(baseStats: CombatStats, baseEnemy: EnemyState, state: CombatState, targetAgentId: string): { stats: CombatStats; enemy: EnemyState; specialMultiplier: number; activeEffects: ActiveEffect[] } {
  const stats = { ...baseStats };
  const enemy: EnemyState = { ...baseEnemy, res: { ...baseEnemy.res }, resReduction: { ...baseEnemy.resReduction }, debuffs: [...baseEnemy.debuffs] };
  let specialMultiplier = 1;
  const activeEffects = pruneExpiredEffects(state);

  for (const active of activeEffects) {
    const context: EffectContext = { state: { ...state, activeEffects }, sourceAgentId: active.sourceCharacterId, targetAgentId };
    if (!evaluateCondition(active.definition.condition, context)) continue;
    const stacks = active.stacks;
    for (const modifier of active.definition.modifiers) {
      const value = modifier.value * stacks;
      if (active.definition.target === 'ENEMY') {
        if (modifier.stat === 'enemyDefReduction') enemy.defReduction += value;
        else if (modifier.stat === 'enemyDefIgnore') enemy.defIgnore += value;
        else if (modifier.stat === 'enemyResReduction') {
          const attribute = modifier.attribute ?? state.team.find((a) => a.id === targetAgentId)?.attribute ?? 'Other';
          enemy.resReduction[attribute] = (enemy.resReduction[attribute] ?? 0) + value;
        } else if (modifier.stat === 'enemyDmgTaken') enemy.dmgTaken += value;
        else if (modifier.stat === 'stunMultiplier') enemy.stunMultiplier += value;
        continue;
      }
      if (!targetMatches(active, state, targetAgentId)) continue;
      if (modifier.stat === 'skillMultiplier') specialMultiplier *= 1 + value;
      else applyStat(stats, modifier.stat, value, modifier.mode ?? 'add');
    }
  }
  return { stats, enemy, specialMultiplier, activeEffects };
}

export function collectAlwaysEffects(state: CombatState, definitions: Array<{ sourceId: string; effects: EffectDefinition[] }>): CombatState {
  let next = state;
  for (const source of definitions) next = triggerEffects(next, source.effects, source.sourceId, 'always').state;
  return next;
}
