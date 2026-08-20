import { addAnomalyBuildup } from './anomaly';
import { resolveBuild } from './build';
import { calculateStandardDamage, expectedCritContribution } from './damage';
import { applyActiveEffects, collectAlwaysEffects, pruneExpiredEffects, triggerEffects } from './effects';
import type { AgentDefinition, AnomalyDefinition, BuildConfig, CombatState, DriveDiscDefinition, EffectDefinition, EnemyState, RotationConfig, RotationResult, SkillDefinition, TeamConfig, TimelineEntry, Trigger, WEngineDefinition } from './types';

export interface SimulationData {
  agents: AgentDefinition[];
  wengines: WEngineDefinition[];
  discs: DriveDiscDefinition[];
  anomalyDefinitions: AnomalyDefinition[];
}

const skillTrigger: Partial<Record<SkillDefinition['type'], Trigger>> = {
  Basic: 'onBasicAttack', Dodge: 'onDodge', 'Dodge Counter': 'onDodge', Assist: 'onAssist', Special: 'onSpecial', 'EX Special': 'onEXSpecial', Chain: 'onChainAttack', Ultimate: 'onUltimate',
};

export function createCombatState(team: AgentDefinition[], enemy: EnemyState): CombatState {
  const activeCharacterId = team[0]?.id ?? '';
  return {
    currentTime: 0,
    activeCharacterId,
    team,
    characterStates: Object.fromEntries(team.map((agent, index) => [agent.id, { id: agent.id, energy: 100, isActive: index === 0, fieldTime: 0 }])),
    enemy: { ...enemy, res: { ...enemy.res }, resReduction: { ...enemy.resReduction }, debuffs: [...enemy.debuffs] },
    activeEffects: [], triggerTimes: {}, effectTriggerTimes: {}, anomaly: { buildup: {}, contributions: {} },
  };
}

export function simulateRotation(teamConfig: TeamConfig, enemy: EnemyState, rotation: RotationConfig, data: SimulationData): RotationResult {
  const resolved = teamConfig.builds.map((build) => {
    const agent = mustAgent(data.agents, build);
    const wengine = data.wengines.find((item) => item.id === build.wengineId);
    return { build, agent, resolution: resolveBuild(agent, build, wengine, data.discs) };
  });
  const team = resolved.map((item) => item.agent);
  let state = createCombatState(team, enemy);
  const sources: Array<{ sourceId: string; effects: EffectDefinition[] }> = resolved.map((item) => ({ sourceId: item.agent.id, effects: item.resolution.effects }));
  state = collectAlwaysEffects(state, sources);
  for (const source of sources) state = triggerEffects(state, source.effects, source.sourceId, 'onBattleStart').state;

  const timeline: TimelineEntry[] = [];
  const damageByCharacter: Record<string, number> = {};
  const damageBySkill: Record<string, number> = {};
  const effectActiveSeconds: Record<string, number> = {};
  const fieldTime: Record<string, number> = {};
  let totalDamage = 0;
  let critContribution = 0;
  let anomalyContribution = 0;

  const accrue = (seconds: number) => {
    if (seconds <= 0) return;
    const start = state.currentTime;
    const end = start + seconds;
    fieldTime[state.activeCharacterId] = (fieldTime[state.activeCharacterId] ?? 0) + seconds;
    for (const effect of state.activeEffects) {
      const activeStart = Math.max(start, effect.startedAt);
      const activeEnd = Math.min(end, effect.expiresAt ?? end);
      if (activeEnd > activeStart) effectActiveSeconds[effect.definition.id] = (effectActiveSeconds[effect.definition.id] ?? 0) + (activeEnd - activeStart);
      if (effect.expiresAt != null && effect.expiresAt > start && effect.expiresAt <= end) timeline.push({ time: effect.expiresAt, kind: 'expire', label: `${effect.definition.name} expirou`, agentId: effect.sourceCharacterId, damage: 0 });
    }
  };

  for (const action of rotation.actions) {
    state = { ...state, activeEffects: pruneExpiredEffects(state) };
    const participant = resolved.find((item) => item.agent.id === action.agentId);
    if (!participant) continue;
    if (action.type === 'switch') {
      if (state.activeCharacterId !== action.agentId) {
        const previous = state.activeCharacterId;
        const oldSource = sources.find((source) => source.sourceId === previous);
        if (oldSource) state = triggerEffects(state, oldSource.effects, previous, 'onLeaveField').state;
        state = { ...state, activeCharacterId: action.agentId };
        state = triggerEffects(state, sources.find((source) => source.sourceId === action.agentId)?.effects ?? [], action.agentId, 'onEnterField').state;
        timeline.push({ time: state.currentTime, kind: 'switch', label: `Switch → ${participant.agent.name}`, agentId: action.agentId, damage: 0 });
      }
      const duration = action.durationOverride ?? 0.5;
      accrue(duration);
      state = { ...state, currentTime: state.currentTime + duration };
      continue;
    }
    if (action.type === 'wait') {
      const duration = action.durationOverride ?? 1;
      timeline.push({ time: state.currentTime, kind: 'action', label: `Wait ${duration.toFixed(2)}s`, damage: 0 });
      accrue(duration);
      state = { ...state, currentTime: state.currentTime + duration };
      continue;
    }
    const skill = participant.agent.skills.find((item) => item.id === action.skillId);
    if (!skill) continue;
    if (state.activeCharacterId !== action.agentId) state = { ...state, activeCharacterId: action.agentId };
    const trigger = skillTrigger[skill.type];
    if (trigger) state = triggerEffects(state, sources.find((source) => source.sourceId === action.agentId)?.effects ?? [], action.agentId, trigger).state;
    timeline.push({ time: state.currentTime, kind: 'action', label: `${participant.agent.name} — ${skill.name}`, agentId: action.agentId, skillId: skill.id, damage: 0 });

    let lastHitAt = 0;
    for (const hit of skill.hits) {
      const delta = Math.max(0, hit.at - lastHitAt);
      accrue(delta);
      state = { ...state, currentTime: state.currentTime + delta, activeEffects: pruneExpiredEffects({ ...state, currentTime: state.currentTime + delta }) };
      lastHitAt = hit.at;
      const applied = applyActiveEffects(participant.resolution.stats, state.enemy, state, action.agentId);
      const breakdown = calculateStandardDamage({ stats: applied.stats, enemy: applied.enemy, skillMultiplier: hit.multiplier, attribute: skill.attribute, canCrit: hit.canCrit, specialMultiplier: applied.specialMultiplier });
      const damage = breakdown.expected;
      totalDamage += damage;
      critContribution += expectedCritContribution(breakdown, applied.stats.critRate);
      damageByCharacter[action.agentId] = (damageByCharacter[action.agentId] ?? 0) + damage;
      damageBySkill[`${action.agentId}:${skill.id}`] = (damageBySkill[`${action.agentId}:${skill.id}`] ?? 0) + damage;
      timeline.push({ time: state.currentTime, kind: 'hit', label: `${participant.agent.name} — ${skill.name} hit`, agentId: action.agentId, skillId: skill.id, damage });
      if (hit.anomalyBuildup && hit.anomalyBuildup > 0) {
        const definition = data.anomalyDefinitions.find((item) => item.attribute === skill.attribute);
        if (definition) {
          const proc = addAnomalyBuildup({ state: state.anomaly, definition, agentId: action.agentId, stats: applied.stats, baseBuildup: hit.anomalyBuildup, now: state.currentTime, enemy: applied.enemy });
          state = { ...state, anomaly: proc.state };
          const anomalyDamage = proc.procDamage + proc.disorderDamage;
          if (anomalyDamage) {
            totalDamage += anomalyDamage;
            anomalyContribution += anomalyDamage;
            damageByCharacter[action.agentId] = (damageByCharacter[action.agentId] ?? 0) + anomalyDamage;
            timeline.push({ time: state.currentTime, kind: 'anomaly', label: `${skill.attribute} Anomaly${proc.disorderDamage ? ' + Disorder' : ''}`, agentId: action.agentId, damage: anomalyDamage });
          }
        }
      }
      state = triggerEffects(state, sources.find((source) => source.sourceId === action.agentId)?.effects ?? [], action.agentId, 'onHit').state;
    }
    const remainder = Math.max(0, (action.durationOverride ?? skill.duration) - lastHitAt);
    accrue(remainder);
    state = { ...state, currentTime: state.currentTime + remainder, activeEffects: pruneExpiredEffects({ ...state, currentTime: state.currentTime + remainder }), lastAction: { agentId: action.agentId, skillType: skill.type, skillId: skill.id, at: state.currentTime + remainder } };
  }

  const duration = state.currentTime;
  return {
    duration,
    totalDamage,
    dps: duration > 0 ? totalDamage / duration : 0,
    timeline,
    damageByCharacter,
    damageBySkill,
    buffUptime: Object.fromEntries(Object.entries(effectActiveSeconds).map(([id, seconds]) => [id, duration ? Math.min(1, seconds / duration) : 0])),
    fieldTime: Object.fromEntries(Object.entries(fieldTime).map(([id, seconds]) => [id, duration ? seconds / duration : 0])),
    critContribution,
    anomalyContribution,
  };
}

function mustAgent(agents: AgentDefinition[], build: BuildConfig): AgentDefinition {
  const agent = agents.find((item) => item.id === build.agentId);
  if (!agent) throw new Error(`Agent não encontrado: ${build.agentId}`);
  return agent;
}
