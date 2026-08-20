import type { AgentDefinition, DriveDiscDefinition, EffectDefinition, WEngineDefinition } from '../engine/types';

export interface ValidationIssue { severity: 'error' | 'warning'; path: string; message: string }

function validateEffect(effect: EffectDefinition, path: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!effect.id) issues.push({ severity: 'error', path, message: 'effect sem id' });
  if (!effect.target) issues.push({ severity: 'error', path, message: 'effect sem target' });
  if (effect.duration != null && effect.duration < 0) issues.push({ severity: 'error', path, message: 'duration negativa' });
  if (effect.maxStacks != null && effect.maxStacks < 1) issues.push({ severity: 'error', path, message: 'maxStacks inválido' });
  if (!effect.modifiers.length) issues.push({ severity: 'warning', path, message: 'effect sem modifiers' });
  if (effect.target === 'SPECIFIC_CHARACTER' && !effect.specificCharacterId) issues.push({ severity: 'error', path, message: 'SPECIFIC_CHARACTER sem specificCharacterId' });
  return issues;
}

export function validateGameData(agents: AgentDefinition[], wengines: WEngineDefinition[], discs: DriveDiscDefinition[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const ids = new Set<string>();
  for (const [index, agent] of agents.entries()) {
    const path = `agents[${index}]`;
    if (ids.has(agent.id)) issues.push({ severity: 'error', path, message: `id duplicado: ${agent.id}` });
    ids.add(agent.id);
    if (!agent.skills.length) issues.push({ severity: 'error', path, message: 'agent sem skills' });
    for (const [skillIndex, skill] of agent.skills.entries()) {
      if (!skill.hits.length) issues.push({ severity: 'error', path: `${path}.skills[${skillIndex}]`, message: 'skill sem hits' });
      for (const [hitIndex, hit] of skill.hits.entries()) if (!(hit.multiplier >= 0)) issues.push({ severity: 'error', path: `${path}.skills[${skillIndex}].hits[${hitIndex}]`, message: 'multiplier inválido' });
    }
    [...agent.coreEffects, ...(agent.additionalAbility ? [agent.additionalAbility] : []), ...agent.mindscapes.flatMap((m) => m.effects)].forEach((effect, i) => issues.push(...validateEffect(effect, `${path}.effects[${i}]`)));
  }
  for (const [index, wengine] of wengines.entries()) wengine.effects.forEach((effect, i) => issues.push(...validateEffect(effect, `wengines[${index}].effects[${i}]`)));
  for (const [index, disc] of discs.entries()) [...disc.twoPiece, ...disc.fourPiece].forEach((effect, i) => issues.push(...validateEffect(effect, `discs[${index}].effects[${i}]`)));
  return issues;
}
