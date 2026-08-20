import type { Condition, EffectContext } from './types';

export function evaluateCondition(condition: Condition | undefined, ctx: EffectContext): boolean {
  if (!condition || condition.op === 'always') return true;
  const { state, sourceAgentId } = ctx;
  switch (condition.op) {
    case 'and': return condition.conditions.every((c) => evaluateCondition(c, ctx));
    case 'or': return condition.conditions.some((c) => evaluateCondition(c, ctx));
    case 'not': return !evaluateCondition(condition.condition, ctx);
    case 'hasFactionMember': return state.team.some((agent) => (!condition.excludingSelf || agent.id !== sourceAgentId) && agent.faction === condition.faction);
    case 'hasAttributeMember': return state.team.some((agent) => (!condition.excludingSelf || agent.id !== sourceAgentId) && agent.attribute === condition.attribute);
    case 'hasSpecialtyMember': return state.team.some((agent) => (!condition.excludingSelf || agent.id !== sourceAgentId) && agent.specialty === condition.specialty);
    case 'enemyIsStunned': return state.enemy.stunned === (condition.value ?? true);
    case 'enemyHasDebuff': return state.enemy.debuffs.includes(condition.debuff);
    case 'characterIsActive': return state.activeCharacterId === sourceAgentId;
    case 'characterIsOffField': return state.activeCharacterId !== sourceAgentId;
    case 'stackAtLeast': return state.activeEffects.some((effect) => effect.definition.id === condition.effectId && effect.stacks >= condition.count);
    case 'energyAtLeast': return (state.characterStates[sourceAgentId]?.energy ?? 0) >= condition.amount;
    case 'previousActionIs': return state.lastAction?.skillType === condition.skillType;
    case 'timeSinceTriggerAtMost': {
      const at = state.triggerTimes[condition.trigger];
      return at != null && state.currentTime - at <= condition.seconds;
    }
    default: {
      const neverCondition: never = condition;
      return Boolean(neverCondition);
    }
  }
}

export function explainCondition(condition: Condition | undefined, ctx: EffectContext): string {
  if (!condition || condition.op === 'always') return 'Sempre ativa.';
  const active = evaluateCondition(condition, ctx);
  return `${active ? 'Ativa' : 'Inativa'} — ${describeCondition(condition)}`;
}

export function describeCondition(condition: Condition): string {
  switch (condition.op) {
    case 'always': return 'sem condição';
    case 'and': return condition.conditions.map(describeCondition).join(' E ');
    case 'or': return `(${condition.conditions.map(describeCondition).join(' OU ')})`;
    case 'not': return `NÃO (${describeCondition(condition.condition)})`;
    case 'hasFactionMember': return `há membro da facção ${condition.faction}`;
    case 'hasAttributeMember': return `há membro ${condition.attribute}`;
    case 'hasSpecialtyMember': return `há membro ${condition.specialty}`;
    case 'enemyIsStunned': return `inimigo ${condition.value === false ? 'não ' : ''}está Stunned`;
    case 'enemyHasDebuff': return `inimigo possui debuff ${condition.debuff}`;
    case 'characterIsActive': return 'fonte está ativa';
    case 'characterIsOffField': return 'fonte está fora de campo';
    case 'stackAtLeast': return `${condition.effectId} tem ≥ ${condition.count} stacks`;
    case 'energyAtLeast': return `energia ≥ ${condition.amount}`;
    case 'previousActionIs': return `ação anterior é ${condition.skillType}`;
    case 'timeSinceTriggerAtMost': return `≤ ${condition.seconds}s desde ${condition.trigger}`;
  }
}
