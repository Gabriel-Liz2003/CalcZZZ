import { emptyAnomalyState } from './anomaly';
import { initialResources } from './agentHandlers';
import type { AgentDefinition, BuildConfig, CombatState, CombatStats, EnemyState, SkillHit, SkillType } from './types';

export function createCombatState(
  team: AgentDefinition[],
  enemy: EnemyState,
  builds: BuildConfig[] = [],
  staticStats: Record<string, CombatStats> = {},
): CombatState {
  const activeCharacterId = team[0]?.id ?? '';
  const buildByAgent = Object.fromEntries(builds.map((build) => [build.agentId, build]));
  return {
    currentTime: 0,
    activeCharacterId,
    team,
    characterStates: Object.fromEntries(team.map((agent, index) => [agent.id, {
      id: agent.id,
      energy: Math.max(0, Math.min(120, buildByAgent[agent.id]?.initialEnergy ?? 0)),
      maxEnergy: 120,
      isActive: index === 0,
      fieldTime: 0,
      resources: initialResources(agent.id),
      staticStats: staticStats[agent.id],
    }])),
    enemy: {
      ...enemy,
      res: { ...enemy.res },
      resReduction: { ...enemy.resReduction },
      debuffs: [...enemy.debuffs],
      stunDuration: enemy.stunDuration ?? 10,
      maxChainAttacks: enemy.maxChainAttacks ?? 3,
    },
    activeEffects: [],
    triggerTimes: {},
    effectTriggerTimes: {},
    anomaly: emptyAnomalyState(),
    chainWindowOpen: false,
    chainAttacksRemaining: 0,
  };
}

export function effectiveSkillLevel(agent: AgentDefinition, build: BuildConfig, type: SkillType, base: number): number {
  let bonus = 0;
  for (const mindscape of agent.mindscapes) if (mindscape.level <= build.mindscape) bonus += mindscape.skillLevelBonuses?.[type] ?? 0;
  return Math.min(16, Math.max(1, Math.trunc((build.skillLevels[type] ?? base) + bonus)));
}

export function scaleHit(hit: SkillHit, level: number, referenceLevel: number): SkillHit {
  const delta = level - referenceLevel;
  return {
    ...hit,
    multiplier: Math.max(0, hit.multiplier + (hit.multiplierGrowth ?? 0) * delta),
    dazeMultiplier: hit.dazeMultiplier == null ? undefined : Math.max(0, hit.dazeMultiplier + (hit.dazeGrowth ?? 0) * delta),
  };
}
