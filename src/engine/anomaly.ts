import { defenseMultiplier, resistanceMultiplier } from './damage';
import type { ActiveAnomaly, AnomalyContribution, AnomalyDefinition, AnomalyState, Attribute, CombatStats, EnemyState } from './types';

export interface AnomalyProcResult {
  state: AnomalyState;
  procDamage: number;
  disorderDamage: number;
  applied?: ActiveAnomaly;
}

export interface AnomalyTick {
  time: number;
  attribute: Attribute;
  damage: number;
  contributions: AnomalyContribution[];
}

export function emptyAnomalyState(): AnomalyState {
  return { buildup: {}, contributions: {}, applications: {} };
}

export function anomalyLevelMultiplier(level: number): number {
  const normalized = Math.min(60, Math.max(1, Math.trunc(Number.isFinite(level) ? level : 60)));
  return Math.floor((1 + (normalized - 1) / 59) * 10000) / 10000;
}

export function buildupAmount(baseBuildup: number, anomalyMastery: number, buildupBonus = 0, buildupRes = 0): number {
  return Math.max(0, baseBuildup) * Math.max(0, anomalyMastery) / 100 * Math.max(0, 1 + buildupBonus) * Math.max(0, 1 - buildupRes);
}

export function thresholdFor(definition: AnomalyDefinition, enemy: EnemyState, applications = 0): number {
  const base = enemy.anomalyThreshold?.[definition.attribute] ?? definition.threshold;
  return Math.max(1, base) * Math.pow(1.02, Math.min(9, Math.max(0, applications)));
}

export function anomalyDamageFromContributions(
  definition: AnomalyDefinition,
  contributions: AnomalyContribution[],
  enemy: EnemyState,
  coefficient = definition.baseMultiplier,
): number {
  const totalBuildup = contributions.reduce((sum, item) => sum + item.buildup, 0);
  if (totalBuildup <= 0 || coefficient <= 0) return 0;
  return contributions.reduce((sum, item) => {
    const share = item.buildup / totalBuildup;
    const pseudoStats: CombatStats = {
      hp:0, atk:item.atk, def:0, impact:0, critRate:0, critDmg:0,
      dmgBonus:item.dmgBonus, pen:item.pen, penRatio:item.penRatio, resIgnore:item.resIgnore,
      anomalyProficiency:item.ap, anomalyMastery:100, energyRegen:0,
    };
    const damage = item.atk * coefficient * (item.ap / 100) * anomalyLevelMultiplier(item.level) *
      (1 + item.dmgBonus) * defenseMultiplier(pseudoStats, enemy, item.level) *
      resistanceMultiplier(pseudoStats, enemy, definition.attribute) * (1 + enemy.dmgTaken) *
      (enemy.stunned ? enemy.stunMultiplier : 1);
    return sum + share * finiteDamage(damage);
  }, 0);
}

export function addAnomalyBuildup(input: {
  state: AnomalyState;
  definition: AnomalyDefinition;
  agentId: string;
  stats: CombatStats;
  baseBuildup: number;
  now: number;
  enemy: EnemyState;
  level?: number;
  buildupBonus?: number;
}): AnomalyProcResult {
  const { definition, agentId, stats, now, enemy } = input;
  const buildupRes = enemy.anomalyBuildupRes?.[definition.attribute] ?? 0;
  const amount = buildupAmount(input.baseBuildup, stats.anomalyMastery, input.buildupBonus ?? 0, buildupRes);
  const attribute = definition.attribute;
  const current = input.state.buildup[attribute] ?? 0;
  const contribution: AnomalyContribution = {
    agentId, buildup: amount, ap: stats.anomalyProficiency, atk: stats.atk, level: input.level ?? 60,
    dmgBonus: stats.dmgBonus, pen: stats.pen, penRatio: stats.penRatio, resIgnore: stats.resIgnore,
  };
  const existingContributions = input.state.contributions[attribute] ?? [];
  const nextContributions = mergeContribution(existingContributions, contribution);
  const nextBuildup = current + amount;
  const applications = input.state.applications[attribute] ?? 0;
  const threshold = thresholdFor(definition, enemy, applications);
  if (nextBuildup < threshold) {
    return {
      state: {
        ...input.state,
        buildup: { ...input.state.buildup, [attribute]: nextBuildup },
        contributions: { ...input.state.contributions, [attribute]: nextContributions },
      },
      procDamage: 0,
      disorderDamage: 0,
    };
  }

  const previous = input.state.active && input.state.active.expiresAt > now ? input.state.active : undefined;
  const disorderDamage = previous && previous.attribute !== attribute
    ? calculateDisorder(previous, now, enemy)
    : 0;
  const procDamage = anomalyDamageFromContributions(definition, nextContributions, enemy, definition.baseMultiplier);
  const applied: ActiveAnomaly | undefined = definition.duration > 0
    ? { attribute, appliedAt: now, expiresAt: now + definition.duration, contributions: nextContributions, lastTickAt: now, ticksTriggered: 0 }
    : undefined;
  const overflow = Math.max(0, nextBuildup - threshold);
  return {
    state: {
      buildup: { ...input.state.buildup, [attribute]: overflow },
      contributions: { ...input.state.contributions, [attribute]: [] },
      applications: { ...input.state.applications, [attribute]: applications + 1 },
      active: applied,
    },
    procDamage,
    disorderDamage,
    applied,
  };
}

export function calculateDisorder(previous: ActiveAnomaly, now: number, enemy: EnemyState): number {
  const remaining = Math.max(0, previous.expiresAt - now);
  const coefficient = disorderCoefficient(previous.attribute, remaining);
  const definition: AnomalyDefinition = {
    attribute: previous.attribute, threshold: 1, baseMultiplier: coefficient, duration: 0,
    meta: { gameVersion:'runtime', source:'runtime', lastVerified:'runtime', verified:true },
  };
  return anomalyDamageFromContributions(definition, previous.contributions, enemy, coefficient);
}

export function disorderCoefficient(attribute: Attribute, remainingSeconds: number): number {
  const remaining = Math.max(0, remainingSeconds);
  switch (attribute) {
    case 'Fire': return 4.5 + Math.floor((remaining + 1e-9) / 0.5) * 0.5;
    case 'Electric': return 4.5 + Math.floor((remaining + 1e-9) / 1) * 1.25;
    case 'Ether': return 4.5 + Math.floor((remaining + 1e-9) / 0.5) * 0.625;
    case 'Physical':
    case 'Ice': return 4.5 + Math.floor(remaining + 1e-9) * 0.075;
    default: return 4.5;
  }
}

export function processTimedAnomaly(
  state: AnomalyState,
  definitions: AnomalyDefinition[],
  start: number,
  end: number,
  enemy: EnemyState,
): { state: AnomalyState; ticks: AnomalyTick[] } {
  const active = state.active;
  if (!active || end <= start || active.expiresAt <= start) return { state: expireActive(state, end), ticks: [] };
  const definition = definitions.find((item) => item.attribute === active.attribute);
  if (!definition || !definition.tickInterval || definition.reactiveTicks || !definition.tickMultiplier) return { state: expireActive(state, end), ticks: [] };
  const interval = definition.tickInterval;
  const limit = definition.maxTicks ?? Number.POSITIVE_INFINITY;
  let ticksTriggered = active.ticksTriggered ?? 0;
  let nextTick = (active.lastTickAt ?? active.appliedAt) + interval;
  const ticks: AnomalyTick[] = [];
  let lastTickAt = active.lastTickAt ?? active.appliedAt;
  while (nextTick <= end + 1e-9 && nextTick <= active.expiresAt + 1e-9 && ticksTriggered < limit) {
    if (nextTick > start + 1e-9) {
      ticks.push({ time: nextTick, attribute: active.attribute, damage: anomalyDamageFromContributions(definition, active.contributions, enemy, definition.tickMultiplier), contributions: active.contributions });
      ticksTriggered += 1;
      lastTickAt = nextTick;
    }
    nextTick += interval;
  }
  const nextActive = end >= active.expiresAt
    ? undefined
    : { ...active, ticksTriggered, lastTickAt };
  return { state: { ...state, active: nextActive }, ticks };
}

export function triggerReactiveAnomalyTick(
  state: AnomalyState,
  definitions: AnomalyDefinition[],
  now: number,
  enemy: EnemyState,
): { state: AnomalyState; tick?: AnomalyTick } {
  const active = state.active;
  if (!active || active.expiresAt <= now) return { state: expireActive(state, now) };
  const definition = definitions.find((item) => item.attribute === active.attribute);
  if (!definition?.reactiveTicks || !definition.tickInterval || !definition.tickMultiplier) return { state };
  if ((active.ticksTriggered ?? 0) >= (definition.maxTicks ?? Number.POSITIVE_INFINITY)) return { state };
  if (now - (active.lastTickAt ?? active.appliedAt) + 1e-9 < definition.tickInterval) return { state };
  const tick: AnomalyTick = { time: now, attribute: active.attribute, damage: anomalyDamageFromContributions(definition, active.contributions, enemy, definition.tickMultiplier), contributions: active.contributions };
  return { state: { ...state, active: { ...active, lastTickAt: now, ticksTriggered: (active.ticksTriggered ?? 0) + 1 } }, tick };
}

function expireActive(state: AnomalyState, now: number): AnomalyState {
  return state.active && state.active.expiresAt <= now ? { ...state, active: undefined } : state;
}

function mergeContribution(items: AnomalyContribution[], next: AnomalyContribution): AnomalyContribution[] {
  const found = items.find((item) => item.agentId === next.agentId);
  if (!found) return [...items, next];
  const total = found.buildup + next.buildup;
  const weighted = (a:number,b:number) => total ? (a * found.buildup + b * next.buildup) / total : b;
  return items.map((item) => item.agentId === next.agentId ? {
    agentId: item.agentId,
    buildup: total,
    ap: weighted(found.ap,next.ap), atk: weighted(found.atk,next.atk), level: Math.round(weighted(found.level,next.level)),
    dmgBonus: weighted(found.dmgBonus,next.dmgBonus), pen: weighted(found.pen,next.pen), penRatio: weighted(found.penRatio,next.penRatio), resIgnore: weighted(found.resIgnore,next.resIgnore),
  } : item);
}

function finiteDamage(value: number): number {
  return Number.isFinite(value) && value >= 0 ? value : 0;
}
