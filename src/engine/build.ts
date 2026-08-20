import type { AgentDefinition, BuildConfig, CombatStats, DriveDiscDefinition, EffectDefinition, StatKey, WEngineDefinition } from './types';

export interface BuildResolution {
  stats: CombatStats;
  effects: EffectDefinition[];
  warnings: string[];
}

function addStat(stats: CombatStats, stat: StatKey, value: number): void {
  if (stat in stats) stats[stat as keyof CombatStats] += value;
}

export function resolveBuild(agent: AgentDefinition, build: BuildConfig, wengine: WEngineDefinition | undefined, discs: DriveDiscDefinition[]): BuildResolution {
  if (build.useManualFinalStats && build.manualFinalStats) {
    return { stats: { ...build.manualFinalStats }, effects: collectBuildEffects(agent, build, wengine, discs), warnings: [] };
  }
  const stats: CombatStats = { ...agent.baseStats };
  const warnings: string[] = [];
  for (const [key, value] of Object.entries(build.mainStats) as Array<[keyof CombatStats, number | undefined]>) if (value != null) stats[key] += value;
  for (const [key, value] of Object.entries(build.substats) as Array<[keyof CombatStats, number | undefined]>) if (value != null) stats[key] += value;
  if (wengine) {
    stats.atk += wengine.baseAtk;
    addStat(stats, wengine.advancedStat.stat, wengine.advancedStat.value);
    if (wengine.specialty !== agent.specialty) warnings.push(`${wengine.name}: passiva pode exigir especialidade ${wengine.specialty}.`);
  }
  return { stats, effects: collectBuildEffects(agent, build, wengine, discs), warnings };
}

export function collectBuildEffects(agent: AgentDefinition, build: BuildConfig, wengine: WEngineDefinition | undefined, discs: DriveDiscDefinition[]): EffectDefinition[] {
  const effects = [...agent.coreEffects];
  if (agent.additionalAbility) effects.push(agent.additionalAbility);
  for (const mindscape of agent.mindscapes) if (mindscape.level <= build.mindscape) effects.push(...mindscape.effects);
  if (wengine) effects.push(...wengine.effects.map((effect) => scaleRefinement(effect, wengine, build.refinement)));
  for (const selection of build.driveDiscs) {
    const set = discs.find((disc) => disc.id === selection.setId);
    if (!set) continue;
    if (selection.pieces >= 2) effects.push(...set.twoPiece);
    if (selection.pieces >= 4) effects.push(...set.fourPiece);
  }
  return effects;
}

function scaleRefinement(effect: EffectDefinition, wengine: WEngineDefinition, refinement: number): EffectDefinition {
  if (!wengine.refinementValues?.length) return effect;
  const index = Math.min(Math.max(refinement, 1), wengine.refinementValues.length) - 1;
  const base = wengine.refinementValues[0] || 1;
  const scale = wengine.refinementValues[index] / base;
  return { ...effect, modifiers: effect.modifiers.map((modifier) => ({ ...modifier, value: modifier.value * scale })) };
}
