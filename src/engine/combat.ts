import type { CombatState, CombatStats, EnemyState, SkillHit } from './types';

export interface DazeResult {
  state: CombatState;
  amount: number;
  stunStarted: boolean;
}

export function calculateDaze(stats: CombatStats, hit: SkillHit, enemy: EnemyState): number {
  const impact = Math.max(0, finite(stats.impact));
  const mv = Math.max(0, finite(hit.dazeMultiplier));
  const dazeBonus = Math.max(-1, finite(stats.dazeBonus));
  const dazeRes = Math.min(1, Math.max(-1, finite(enemy.dazeRes)));
  const dazeTaken = Math.max(-1, finite(enemy.dazeTaken));
  return finitePositive(impact * mv * (1 + dazeBonus) * (1 - dazeRes) * (1 + dazeTaken));
}

export function addDaze(state: CombatState, amount: number, at = state.currentTime): DazeResult {
  if (state.enemy.stunned || amount <= 0) return { state, amount: 0, stunStarted: false };
  const maxDaze = Math.max(1, finite(state.enemy.maxDaze) || 100);
  const nextDaze = Math.min(maxDaze, Math.max(0, finite(state.enemy.daze)) + amount);
  const stunStarted = nextDaze >= maxDaze;
  const enemy: EnemyState = {
    ...state.enemy,
    daze: nextDaze,
    stunned: stunStarted ? true : state.enemy.stunned,
    stunStart: stunStarted ? at : state.enemy.stunStart,
  };
  return { state: { ...state, enemy }, amount, stunStarted };
}

export function expireStun(state: CombatState, now = state.currentTime): CombatState {
  const { enemy } = state;
  if (!enemy.stunned || enemy.stunStart == null) return state;
  const duration = Math.max(0, finite(enemy.stunDuration) || 10);
  if (now < enemy.stunStart + duration) return state;
  return {
    ...state,
    enemy: { ...enemy, stunned: false, daze: 0, stunStart: undefined },
    chainWindowOpen: false,
    chainAttacksRemaining: 0,
  };
}

export function stunOverlapSeconds(state: CombatState, start: number, end: number): number {
  const { enemy } = state;
  if (!enemy.stunned || enemy.stunStart == null || end <= start) return 0;
  const duration = Math.max(0, finite(enemy.stunDuration) || 10);
  const stunEnd = enemy.stunStart + duration;
  return Math.max(0, Math.min(end, stunEnd) - Math.max(start, enemy.stunStart));
}

export function openChainWindow(state: CombatState): CombatState {
  if (!state.enemy.stunned) return state;
  const enemyLimit = Math.max(1, Math.trunc(finite(state.enemy.maxChainAttacks) || 3));
  const partyLimit = Math.max(1, state.team.length);
  return {
    ...state,
    chainWindowOpen: true,
    chainAttacksRemaining: Math.min(enemyLimit, partyLimit),
  };
}

export function consumeChainAttack(state: CombatState): CombatState {
  const remaining = Math.max(0, (state.chainAttacksRemaining ?? 0) - 1);
  return { ...state, chainAttacksRemaining: remaining, chainWindowOpen: remaining > 0 };
}

export function canUseChainAttack(state: CombatState): boolean {
  return Boolean(state.enemy.stunned && state.chainWindowOpen && (state.chainAttacksRemaining ?? 0) > 0);
}

export function spendEnergy(state: CombatState, agentId: string, cost: number, ignoreRequirements = false): { state: CombatState; ok: boolean; before: number; after: number } {
  const runtime = state.characterStates[agentId];
  if (!runtime) return { state, ok: false, before: 0, after: 0 };
  const before = Math.max(0, finite(runtime.energy));
  const normalizedCost = Math.max(0, finite(cost));
  if (!ignoreRequirements && before + 1e-9 < normalizedCost) return { state, ok: false, before, after: before };
  const after = ignoreRequirements ? Math.max(0, before - normalizedCost) : before - normalizedCost;
  return {
    state: { ...state, characterStates: { ...state.characterStates, [agentId]: { ...runtime, energy: after } } },
    ok: true,
    before,
    after,
  };
}

export function addEnergy(state: CombatState, agentId: string, amount: number): { state: CombatState; before: number; after: number } {
  const runtime = state.characterStates[agentId];
  if (!runtime) return { state, before: 0, after: 0 };
  const before = Math.max(0, finite(runtime.energy));
  const maxEnergy = Math.max(0, finite(runtime.maxEnergy) || 120);
  const after = Math.min(maxEnergy, Math.max(0, before + finite(amount)));
  return { state: { ...state, characterStates: { ...state.characterStates, [agentId]: { ...runtime, energy: after } } }, before, after };
}

export function regenerateEnergy(state: CombatState, perSecond: Record<string, number>, seconds: number): CombatState {
  if (seconds <= 0) return state;
  let next = state;
  for (const [agentId, rate] of Object.entries(perSecond)) next = addEnergy(next, agentId, Math.max(0, finite(rate)) * seconds).state;
  return next;
}

function finite(value: number | undefined): number {
  return value != null && Number.isFinite(value) ? value : 0;
}

function finitePositive(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}
