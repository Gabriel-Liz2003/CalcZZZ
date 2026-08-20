import { calculateStandardDamage } from './damage';
import { activateEffect, applyEffects } from './effects';
import type { AgentDefinition, Effect, EnemyState, SkillDefinition, TimedEffect } from './types';

export interface RotationStep {
  agent: AgentDefinition;
  skill: SkillDefinition;
  triggerEffects?: Effect[];
}

export interface RotationResult {
  duration: number;
  totalDamage: number;
  dps: number;
  timeline: Array<{ time: number; label: string; damage: number }>;
}

export function simulateRotation(
  team: AgentDefinition[],
  enemy: EnemyState,
  steps: RotationStep[],
  passiveEffects: TimedEffect[] = [],
): RotationResult {
  let time = 0;
  let totalDamage = 0;
  const timeline: RotationResult['timeline'] = [];
  const effects = [...passiveEffects];

  for (const step of steps) {
    const ctx = { activeAgentId: step.agent.id, team, time };
    const state = applyEffects(step.agent.stats, enemy, effects, ctx);
    const damage = calculateStandardDamage(state.stats, state.enemy, step.skill.multiplier).expected;
    totalDamage += damage;
    timeline.push({ time, label: `${step.agent.name} — ${step.skill.name}`, damage });

    for (const effect of step.triggerEffects ?? []) {
      effects.push(activateEffect(effect, step.agent.id, time));
    }
    time += step.skill.duration;
  }

  return {
    duration: time,
    totalDamage,
    dps: time > 0 ? totalDamage / time : 0,
    timeline,
  };
}
