import type { AgentDefinition, BuildConfig, CombatStats, DriveDiscDefinition, EffectDefinition, StatKey, WEngineDefinition } from './types';

export interface BuildResolution {
  baseStats: CombatStats;
  staticStats: CombatStats;
  stats: CombatStats;
  effects: EffectDefinition[];
  warnings: string[];
}

function addStat(stats: CombatStats, stat: StatKey, value: number): void {
  if (stat in stats && Number.isFinite(value)) {
    const key = stat as keyof CombatStats;
    const current = typeof stats[key] === 'number' && Number.isFinite(stats[key]) ? stats[key] : 0;
    stats[key] = current + value;
  }
}

function applyPartial(stats: CombatStats, partial?: Partial<CombatStats>): void {
  if (!partial) return;
  for (const [key, value] of Object.entries(partial) as Array<[keyof CombatStats, number | undefined]>) {
    if (value != null && Number.isFinite(value)) {
      const current = typeof stats[key] === 'number' && Number.isFinite(stats[key]) ? stats[key] : 0;
      stats[key] = current + value;
    }
  }
}

export function resolveBuild(agent: AgentDefinition, build: BuildConfig, wengine: WEngineDefinition | undefined, discs: DriveDiscDefinition[]): BuildResolution {
  const baseStats: CombatStats = { ...agent.baseStats };
  const staticStats: CombatStats = { ...baseStats };
  const warnings: string[] = [];

  applyPartial(staticStats, agent.staticBonuses);
  if (wengine) {
    staticStats.atk += wengine.baseAtk;
    addStat(staticStats, wengine.advancedStat.stat, wengine.advancedStat.value);
    if (wengine.specialty !== agent.specialty) warnings.push(`${wengine.name}: passiva exige especialidade ${wengine.specialty}; stats base continuam aplicados.`);
  }
  applyPartial(staticStats, build.mainStats);
  applyPartial(staticStats, build.substats);

  const stats = build.useManualFinalStats && build.manualFinalStats
    ? { ...build.manualFinalStats }
    : { ...staticStats };
  if (build.useManualFinalStats && !build.manualFinalStats) warnings.push('Manual final stats ativado sem valores; usando static stats.');

  return { baseStats, staticStats, stats, effects: collectBuildEffects(agent, build, wengine, discs), warnings };
}

export function collectBuildEffects(agent: AgentDefinition, build: BuildConfig, wengine: WEngineDefinition | undefined, discs: DriveDiscDefinition[]): EffectDefinition[] {
  const effects = [...agent.coreEffects];
  if (agent.additionalAbility) effects.push(agent.additionalAbility);
  for (const mindscape of agent.mindscapes) if (mindscape.level <= build.mindscape) effects.push(...mindscape.effects);
  if (wengine && wengine.specialty === agent.specialty) effects.push(...wengine.effects.map((effect) => scaleRefinement(effect, wengine, build.refinement)));
  for (const selection of build.driveDiscs) {
    const set = discs.find((disc) => disc.id === selection.setId);
    if (!set) continue;
    if (selection.pieces >= 2) effects.push(...set.twoPiece);
    if (selection.pieces >= 4) effects.push(...set.fourPiece);
  }
  return effects;
}

function scaleRefinement(effect: EffectDefinition, wengine: WEngineDefinition, refinement: number): EffectDefinition {
  const index = Math.min(Math.max(refinement, 1), 5) - 1;
  return {
    ...effect,
    modifiers: effect.modifiers.map((modifier) => {
      if (modifier.refinementValues?.length) {
        const selected = modifier.refinementValues[Math.min(index, modifier.refinementValues.length - 1)];
        return { ...modifier, value: selected };
      }
      if (!wengine.refinementValues?.length) return modifier;
      const safeIndex = Math.min(index, wengine.refinementValues.length - 1);
      const base = wengine.refinementValues[0] || 1;
      const scale = wengine.refinementValues[safeIndex] / base;
      return { ...modifier, value: modifier.value * scale };
    }),
  };
}
