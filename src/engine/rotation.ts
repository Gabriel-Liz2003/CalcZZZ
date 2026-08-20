import { addAnomalyBuildup, emptyAnomalyState, processTimedAnomaly, triggerReactiveAnomalyTick } from './anomaly';
import { advanceUniqueResources, afterStunExpiredUnique, afterUniqueSkillHit, applyUniqueSkillStats, beforeUniqueSkill, initialResources, onStunStartedUnique, validateUniqueSkill } from './agentHandlers';
import { resolveBuild } from './build';
import { addDaze, addEnergy, calculateDaze, canUseChainAttack, consumeChainAttack, expireStun, openChainWindow, spendEnergy, stunOverlapSeconds } from './combat';
import { calculateStandardDamage, expectedCritContribution } from './damage';
import { applyActiveEffects, collectAlwaysEffects, pruneExpiredEffects, triggerEffects } from './effects';
import type { AgentDefinition, AnomalyContribution, AnomalyDefinition, BuildConfig, CombatState, DriveDiscDefinition, EffectDefinition, EnemyState, RotationAction, RotationConfig, RotationResult, SkillDefinition, TeamConfig, TimelineEntry, Trigger, WEngineDefinition } from './types';

export interface SimulationData {
  agents: AgentDefinition[];
  wengines: WEngineDefinition[];
  discs: DriveDiscDefinition[];
  anomalyDefinitions: AnomalyDefinition[];
}

const skillTrigger: Partial<Record<SkillDefinition['type'], Trigger>> = {
  Basic: 'onBasicAttack', Dodge: 'onDodge', 'Dodge Counter': 'onDodge', Assist: 'onAssist', Special: 'onSpecial', 'EX Special': 'onEXSpecial', Chain: 'onChainAttack', Ultimate: 'onUltimate',
};

export function createCombatState(team: AgentDefinition[], enemy: EnemyState, builds: BuildConfig[] = []): CombatState {
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

export function simulateRotation(teamConfig: TeamConfig, enemy: EnemyState, rotation: RotationConfig, data: SimulationData): RotationResult {
  const resolved = teamConfig.builds.map((build) => {
    const agent = mustAgent(data.agents, build);
    const wengine = data.wengines.find((item) => item.id === build.wengineId);
    return { build, agent, resolution: resolveBuild(agent, build, wengine, data.discs) };
  });
  const team = resolved.map((item) => item.agent);
  const mindscapes = Object.fromEntries(resolved.map((item) => [item.agent.id, item.build.mindscape]));
  let state = createCombatState(team, enemy, teamConfig.builds);
  if ((mindscapes.dialyn ?? 0) >= 4 && state.characterStates.dialyn) state = addEnergy(state, 'dialyn', 20).state;

  const sources: Array<{ sourceId: string; effects: EffectDefinition[] }> = resolved.map((item) => ({ sourceId: item.agent.id, effects: item.resolution.effects }));
  state = collectAlwaysEffects(state, sources);
  for (const source of sources) state = triggerEffects(state, source.effects, source.sourceId, 'onBattleStart').state;

  const timeline: TimelineEntry[] = [];
  const warnings: string[] = [];
  const damageByCharacter: Record<string, number> = {};
  const damageBySkill: Record<string, number> = {};
  const effectActiveSeconds: Record<string, number> = {};
  const fieldTime: Record<string, number> = {};
  let totalDamage = 0;
  let critContribution = 0;
  let anomalyContribution = 0;
  let stunSeconds = 0;
  let firstLoopDamage = 0;
  let firstLoopDuration = 0;

  const addAnomalyDamage = (damage: number, contributions: AnomalyContribution[], label: string, time: number) => {
    if (!(damage > 0) || !Number.isFinite(damage)) return;
    totalDamage += damage;
    anomalyContribution += damage;
    const totalBuildup = contributions.reduce((sum, item) => sum + item.buildup, 0);
    for (const item of contributions) {
      const share = totalBuildup > 0 ? item.buildup / totalBuildup : 0;
      damageByCharacter[item.agentId] = (damageByCharacter[item.agentId] ?? 0) + damage * share;
    }
    timeline.push({ time, kind: 'anomaly', label, damage });
  };

  const advance = (seconds: number) => {
    if (!(seconds > 0)) return;
    let remaining = seconds;
    while (remaining > 1e-9) {
      const start = state.currentTime;
      const stunEnd = state.enemy.stunned && state.enemy.stunStart != null ? state.enemy.stunStart + (state.enemy.stunDuration ?? 10) : Number.POSITIVE_INFINITY;
      const chunk = Math.min(remaining, Math.max(0, stunEnd - start) || remaining);
      const end = start + chunk;

      fieldTime[state.activeCharacterId] = (fieldTime[state.activeCharacterId] ?? 0) + chunk;
      stunSeconds += stunOverlapSeconds(state, start, end);
      for (const effect of state.activeEffects) {
        const activeStart = Math.max(start, effect.startedAt);
        const activeEnd = Math.min(end, effect.expiresAt ?? end);
        if (activeEnd > activeStart) effectActiveSeconds[effect.definition.id] = (effectActiveSeconds[effect.definition.id] ?? 0) + (activeEnd - activeStart);
        if (effect.expiresAt != null && effect.expiresAt > start && effect.expiresAt <= end) timeline.push({ time: effect.expiresAt, kind: 'expire', label: `${effect.definition.name} expirou`, agentId: effect.sourceCharacterId, damage: 0 });
      }

      const timed = processTimedAnomaly(state.anomaly, data.anomalyDefinitions, start, end, state.enemy);
      state = { ...state, anomaly: timed.state };
      for (const tick of timed.ticks) addAnomalyDamage(tick.damage, tick.contributions, `${tick.attribute} Anomaly tick`, tick.time);

      // Energy regeneration is evaluated from current combat stats, so off-field/temporary bonuses can participate.
      for (const participant of resolved) {
        const applied = applyActiveEffects(participant.resolution.stats, state.enemy, state, participant.agent.id);
        const rate = Math.max(0, applied.stats.energyRegen ?? 0);
        if (rate > 0) state = addEnergy(state, participant.agent.id, rate * chunk).state;
      }
      state = advanceUniqueResources(state, chunk, mindscapes).state;
      state = { ...state, currentTime: end, activeEffects: pruneExpiredEffects({ ...state, currentTime: end }) };

      const wasStunned = state.enemy.stunned;
      state = expireStun(state, end);
      if (wasStunned && !state.enemy.stunned) {
        state = afterStunExpiredUnique(state);
        timeline.push({ time: end, kind: 'stun', label: 'Stun expirou; Daze resetado', damage: 0 });
      }
      remaining -= chunk;
      if (chunk <= 1e-9) break;
    }
  };

  const warn = (action: RotationAction, message: string) => {
    warnings.push(message);
    timeline.push({ time: state.currentTime, kind: 'warning', label: message, agentId: action.agentId, skillId: action.skillId, damage: 0 });
  };

  const executeAction = (action: RotationAction): void => {
    state = { ...state, activeEffects: pruneExpiredEffects(state) };
    const participant = resolved.find((item) => item.agent.id === action.agentId);
    if (!participant) { warn(action, `Agente ausente da equipe: ${action.agentId}`); return; }

    if (action.type === 'switch') {
      if (state.activeCharacterId !== action.agentId) {
        const previous = state.activeCharacterId;
        const oldSource = sources.find((source) => source.sourceId === previous);
        if (oldSource) state = triggerEffects(state, oldSource.effects, previous, 'onLeaveField').state;
        state = {
          ...state,
          activeCharacterId: action.agentId,
          characterStates: Object.fromEntries(Object.entries(state.characterStates).map(([id, runtime]) => [id, { ...runtime, isActive: id === action.agentId }])),
        };
        state = triggerEffects(state, sources.find((source) => source.sourceId === action.agentId)?.effects ?? [], action.agentId, 'onEnterField').state;
        timeline.push({ time: state.currentTime, kind: 'switch', label: `Switch → ${participant.agent.name}`, agentId: action.agentId, damage: 0 });
      }
      advance(action.durationOverride ?? 0.5);
      return;
    }

    if (action.type === 'wait') {
      const duration = Math.max(0, action.durationOverride ?? 1);
      timeline.push({ time: state.currentTime, kind: 'action', label: `Wait ${duration.toFixed(2)}s`, damage: 0 });
      advance(duration);
      return;
    }

    const skill = participant.agent.skills.find((item) => item.id === action.skillId);
    if (!skill) { warn(action, `Skill inexistente: ${action.skillId ?? '(sem id)'}`); return; }
    const force = Boolean(action.force || rotation.forceInvalidActions);
    if (state.activeCharacterId !== action.agentId && !force) { warn(action, `${participant.agent.name}: ação inválida — personagem não está ativo.`); return; }
    if (state.activeCharacterId !== action.agentId && force) state = { ...state, activeCharacterId: action.agentId };
    if (skill.type === 'Chain' && !canUseChainAttack(state) && !force) { warn(action, `${participant.agent.name}: Chain Attack sem janela válida.`); return; }
    const uniqueError = validateUniqueSkill({ state, agentId: action.agentId, skill, mindscape: participant.build.mindscape });
    if (uniqueError && !force) { warn(action, uniqueError); return; }

    if (skill.energyCost) {
      const spent = spendEnergy(state, action.agentId, skill.energyCost, Boolean(rotation.ignoreResourceRequirements || force));
      if (!spent.ok) { warn(action, `${participant.agent.name}: Energy insuficiente (${spent.before.toFixed(1)}/${skill.energyCost}).`); return; }
      state = spent.state;
      timeline.push({ time: state.currentTime, kind: 'resource', label: `${participant.agent.name} Energy ${spent.before.toFixed(1)} → ${spent.after.toFixed(1)}`, agentId: action.agentId, damage: 0 });
    }

    const beforeUnique = beforeUniqueSkill({ state, agentId: action.agentId, skill, mindscape: participant.build.mindscape });
    state = beforeUnique.state;
    timeline.push(...beforeUnique.events);
    const trigger = skillTrigger[skill.type];
    if (trigger) {
      const triggered = triggerEffects(state, sources.find((source) => source.sourceId === action.agentId)?.effects ?? [], action.agentId, trigger);
      state = triggered.state;
      for (const effect of triggered.activated) timeline.push({ time: state.currentTime, kind: 'effect', label: `${effect.definition.name} ativado (${effect.stacks} stack${effect.stacks === 1 ? '' : 's'})`, agentId: action.agentId, damage: 0 });
    }
    timeline.push({ time: state.currentTime, kind: 'action', label: `${participant.agent.name} — ${skill.name}`, agentId: action.agentId, skillId: skill.id, damage: 0 });

    let lastHitAt = 0;
    for (let hitIndex = 0; hitIndex < skill.hits.length; hitIndex += 1) {
      const hit = skill.hits[hitIndex];
      const delta = Math.max(0, hit.at - lastHitAt);
      advance(delta);
      lastHitAt = hit.at;

      let applied = applyActiveEffects(participant.resolution.stats, state.enemy, state, action.agentId);
      const uniqueStats = applyUniqueSkillStats(state, action.agentId, skill, { critDmg: applied.stats.critDmg, impact: applied.stats.impact });
      applied = { ...applied, stats: { ...applied.stats, ...uniqueStats } };
      const breakdown = calculateStandardDamage({
        stats: applied.stats,
        enemy: applied.enemy,
        skillMultiplier: hit.multiplier,
        attribute: skill.attribute,
        attackerLevel: participant.build.level,
        canCrit: hit.canCrit,
        specialMultiplier: applied.specialMultiplier,
      });
      const damage = breakdown.expected;
      totalDamage += damage;
      critContribution += expectedCritContribution(breakdown, applied.stats.critRate);
      damageByCharacter[action.agentId] = (damageByCharacter[action.agentId] ?? 0) + damage;
      damageBySkill[`${action.agentId}:${skill.id}`] = (damageBySkill[`${action.agentId}:${skill.id}`] ?? 0) + damage;
      timeline.push({
        time: state.currentTime,
        kind: 'hit',
        label: `${participant.agent.name} — ${skill.name} hit ${hitIndex + 1}`,
        agentId: action.agentId,
        skillId: skill.id,
        damage,
        activeBuffs: applied.activeEffects.map((effect) => `${effect.definition.name} ×${effect.stacks}`),
        enemyDebuffs: [...applied.enemy.debuffs],
      });

      const reactive = triggerReactiveAnomalyTick(state.anomaly, data.anomalyDefinitions, state.currentTime, applied.enemy);
      state = { ...state, anomaly: reactive.state };
      if (reactive.tick) addAnomalyDamage(reactive.tick.damage, reactive.tick.contributions, `${reactive.tick.attribute} reactive tick`, state.currentTime);

      if (hit.dazeMultiplier && hit.dazeMultiplier > 0) {
        const daze = calculateDaze(applied.stats, hit, applied.enemy);
        const dazeResult = addDaze(state, daze, state.currentTime);
        state = dazeResult.state;
        if (dazeResult.stunStarted) {
          state = openChainWindow(state);
          for (const source of sources) state = triggerEffects(state, source.effects, source.sourceId, 'onStun').state;
          const uniqueStun = onStunStartedUnique(state, mindscapes);
          state = uniqueStun.state;
          timeline.push({ time: state.currentTime, kind: 'stun', label: `Stun iniciado (${state.enemy.stunDuration ?? 10}s)`, agentId: action.agentId, damage: 0 });
          timeline.push(...uniqueStun.events);
        }
      }

      if (hit.anomalyBuildup && hit.anomalyBuildup > 0) {
        const definition = data.anomalyDefinitions.find((item) => item.attribute === skill.attribute);
        if (definition) {
          const proc = addAnomalyBuildup({
            state: state.anomaly,
            definition,
            agentId: action.agentId,
            stats: applied.stats,
            baseBuildup: hit.anomalyBuildup,
            now: state.currentTime,
            enemy: applied.enemy,
            level: participant.build.level,
          });
          state = { ...state, anomaly: proc.state };
          if (proc.procDamage) addAnomalyDamage(proc.procDamage, proc.applied?.contributions ?? [], `${skill.attribute} Anomaly`, state.currentTime);
          if (proc.disorderDamage) {
            const previousContributions = proc.applied?.contributions ?? [];
            addAnomalyDamage(proc.disorderDamage, previousContributions, 'Disorder', state.currentTime);
            for (const source of sources) state = triggerEffects(state, source.effects, source.sourceId, 'onDisorder').state;
          }
          if (proc.applied) for (const source of sources) state = triggerEffects(state, source.effects, source.sourceId, 'onAnomaly').state;
        }
      }

      state = triggerEffects(state, sources.find((source) => source.sourceId === action.agentId)?.effects ?? [], action.agentId, 'onHit').state;
      if (hit.heavy || hitIndex === skill.hits.length - 1) {
        const unique = afterUniqueSkillHit({ state, agentId: action.agentId, skill, mindscape: participant.build.mindscape });
        state = unique.state;
        timeline.push(...unique.events);
      }
    }

    if (skill.energyGeneration) {
      const runtime = state.characterStates[action.agentId];
      const before = runtime?.energy ?? 0;
      state = addEnergy(state, action.agentId, skill.energyGeneration * Math.max(0, participant.resolution.stats.energyGenerationRate ?? 1)).state;
      const after = state.characterStates[action.agentId]?.energy ?? before;
      timeline.push({ time: state.currentTime, kind: 'resource', label: `${participant.agent.name} Energy ${before.toFixed(1)} → ${after.toFixed(1)}`, agentId: action.agentId, damage: 0 });
    }
    if (skill.type === 'Chain' && canUseChainAttack(state)) state = consumeChainAttack(state);
    const remainder = Math.max(0, (action.durationOverride ?? skill.duration) - lastHitAt);
    advance(remainder);
    state = { ...state, lastAction: { agentId: action.agentId, skillType: skill.type, skillId: skill.id, at: state.currentTime } };
  };

  const repeat = Math.max(1, Math.trunc(rotation.repeat ?? 1));
  const simulateFor = rotation.simulateFor && rotation.simulateFor > 0 ? rotation.simulateFor : undefined;
  let loop = 0;
  while (loop < repeat || (simulateFor != null && state.currentTime < simulateFor)) {
    const loopStartDamage = totalDamage;
    const loopStartTime = state.currentTime;
    for (const action of rotation.actions) {
      if (simulateFor != null && state.currentTime >= simulateFor) break;
      executeAction(action);
    }
    loop += 1;
    if (loop === 1) {
      firstLoopDamage = totalDamage - loopStartDamage;
      firstLoopDuration = state.currentTime - loopStartTime;
    }
    if (rotation.actions.length === 0 || state.currentTime === loopStartTime) break;
    if (simulateFor == null && loop >= repeat) break;
  }

  const duration = state.currentTime;
  return {
    duration,
    totalDamage,
    dps: duration > 0 ? totalDamage / duration : 0,
    burstDps: firstLoopDuration > 0 ? firstLoopDamage / firstLoopDuration : 0,
    sustainedDps: duration > 0 ? totalDamage / duration : 0,
    timeline,
    damageByCharacter,
    damageBySkill,
    buffUptime: Object.fromEntries(Object.entries(effectActiveSeconds).map(([id, seconds]) => [id, duration ? Math.min(1, seconds / duration) : 0])),
    fieldTime: Object.fromEntries(Object.entries(fieldTime).map(([id, seconds]) => [id, duration ? seconds / duration : 0])),
    critContribution,
    anomalyContribution,
    stunUptime: duration ? Math.min(1, stunSeconds / duration) : 0,
    warnings,
    finalState: state,
  };
}

function mustAgent(agents: AgentDefinition[], build: BuildConfig): AgentDefinition {
  const agent = agents.find((item) => item.id === build.agentId);
  if (!agent) throw new Error(`Agent não encontrado: ${build.agentId}`);
  return agent;
}
