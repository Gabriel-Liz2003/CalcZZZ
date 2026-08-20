import { defenseMultiplier, resistanceMultiplier } from './damage';
import type { ActiveAnomaly, AnomalyContribution, AnomalyDefinition, AnomalyState, Attribute, CombatStats, EnemyState } from './types';

export interface AnomalyProcResult {
  state: AnomalyState;
  procDamage: number;
  disorderDamage: number;
  applied?: ActiveAnomaly;
}

export function emptyAnomalyState(): AnomalyState {
  return { buildup: {}, contributions: {} };
}

export function buildupAmount(baseBuildup: number, anomalyMastery: number): number {
  return baseBuildup * Math.max(0, anomalyMastery) / 100;
}

export function anomalyDamageFromContributions(definition: AnomalyDefinition, contributions: AnomalyContribution[], enemy: EnemyState): number {
  const totalBuildup = contributions.reduce((sum, item) => sum + item.buildup, 0);
  if (totalBuildup <= 0) return 0;
  return contributions.reduce((sum, item) => {
    const share = item.buildup / totalBuildup;
    const apMultiplier = item.ap / 100;
    const pseudoStats: CombatStats = { hp:0, atk:item.atk, def:0, impact:0, critRate:0, critDmg:0, dmgBonus:0, pen:0, penRatio:0, resIgnore:0, anomalyProficiency:item.ap, anomalyMastery:100, energyRegen:0 };
    return sum + share * item.atk * apMultiplier * definition.baseMultiplier * defenseMultiplier(pseudoStats, enemy) * resistanceMultiplier(pseudoStats, enemy, definition.attribute) * (1 + enemy.dmgTaken);
  }, 0);
}

export function addAnomalyBuildup(input: { state: AnomalyState; definition: AnomalyDefinition; agentId: string; stats: CombatStats; baseBuildup: number; now: number; enemy: EnemyState; }): AnomalyProcResult {
  const { definition, agentId, stats, now, enemy } = input;
  const amount = buildupAmount(input.baseBuildup, stats.anomalyMastery);
  const attribute: Attribute = definition.attribute;
  const current = input.state.buildup[attribute] ?? 0;
  const contribution: AnomalyContribution = { agentId, buildup: amount, ap: stats.anomalyProficiency, atk: stats.atk };
  const existingContributions = input.state.contributions[attribute] ?? [];
  const nextContributions = mergeContribution(existingContributions, contribution);
  const nextBuildup = current + amount;
  if (nextBuildup < definition.threshold) {
    return { state: { ...input.state, buildup: { ...input.state.buildup, [attribute]: nextBuildup }, contributions: { ...input.state.contributions, [attribute]: nextContributions } }, procDamage: 0, disorderDamage: 0 };
  }

  const procDamage = anomalyDamageFromContributions(definition, nextContributions, enemy);
  const previous = input.state.active;
  const disorderDamage = previous && previous.attribute !== attribute ? calculateDisorder(previous, now, definition, enemy) : 0;
  const applied: ActiveAnomaly = { attribute, appliedAt: now, expiresAt: now + definition.duration, contributions: nextContributions };
  const overflow = Math.max(0, nextBuildup - definition.threshold);
  return { state: { buildup: { ...input.state.buildup, [attribute]: overflow }, contributions: { ...input.state.contributions, [attribute]: [] }, active: applied }, procDamage, disorderDamage, applied };
}

function mergeContribution(items: AnomalyContribution[], next: AnomalyContribution): AnomalyContribution[] {
  const found = items.find((item) => item.agentId === next.agentId);
  if (!found) return [...items, next];
  const total = found.buildup + next.buildup;
  return items.map((item) => item.agentId === next.agentId ? {
    agentId: item.agentId,
    buildup: total,
    ap: total ? (found.ap * found.buildup + next.ap * next.buildup) / total : next.ap,
    atk: total ? (found.atk * found.buildup + next.atk * next.buildup) / total : next.atk,
  } : item);
}

export function calculateDisorder(previous: ActiveAnomaly, now: number, incoming: AnomalyDefinition, enemy: EnemyState): number {
  const remaining = Math.max(0, previous.expiresAt - now);
  const durationRatio = previous.expiresAt > previous.appliedAt ? remaining / (previous.expiresAt - previous.appliedAt) : 0;
  const totalBuildup = previous.contributions.reduce((sum, item) => sum + item.buildup, 0);
  if (!totalBuildup || !incoming.disorderBaseMultiplier) return 0;
  return previous.contributions.reduce((sum, item) => {
    const share = item.buildup / totalBuildup;
    const pseudo: CombatStats = { hp:0, atk:item.atk, def:0, impact:0, critRate:0, critDmg:0, dmgBonus:0, pen:0, penRatio:0, resIgnore:0, anomalyProficiency:item.ap, anomalyMastery:100, energyRegen:0 };
    return sum + share * item.atk * (item.ap / 100) * incoming.disorderBaseMultiplier! * durationRatio * defenseMultiplier(pseudo, enemy) * resistanceMultiplier(pseudo, enemy, previous.attribute) * (1 + enemy.dmgTaken);
  }, 0);
}
