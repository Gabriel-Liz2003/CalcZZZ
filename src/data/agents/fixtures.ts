import type { AgentDefinition } from '../../engine/types';
import { GAME_DATA_VERSION, INTERNAL_SOURCE, LAST_VERIFIED } from '../meta';

const meta = { gameVersion: GAME_DATA_VERSION, source: INTERNAL_SOURCE, lastVerified: LAST_VERIFIED, verified: true, notes: 'Fixture matemático; não representa personagem do jogo.' } as const;

export const trainingAttacker: AgentDefinition = {
  id: 'training-attacker', name: 'Training Attacker', rarity: 'A', attribute: 'Physical', specialty: 'Attack', faction: 'Test', maxLevel: 60,
  baseStats: { hp: 8000, atk: 3000, def: 600, impact: 100, critRate: 0.7, critDmg: 1.4, dmgBonus: 0.5, pen: 0, penRatio: 0, resIgnore: 0, anomalyProficiency: 100, anomalyMastery: 100, energyRegen: 1.2 },
  skills: [
    { id: 'test-hit', name: 'Test Hit', type: 'Basic', level: 12, attribute: 'Physical', duration: 1, hits: [{ multiplier: 1, at: 0.5, anomalyBuildup: 25 }], meta },
    { id: 'test-ult', name: 'Test Ultimate', type: 'Ultimate', level: 12, attribute: 'Physical', duration: 2, hits: [{ multiplier: 5, at: 1 }], meta },
  ], coreEffects: [], mindscapes: [], meta,
};

export const trainingSupport: AgentDefinition = {
  id: 'training-support', name: 'Training Support', rarity: 'A', attribute: 'Ether', specialty: 'Support', faction: 'Test', maxLevel: 60,
  baseStats: { hp: 8000, atk: 1000, def: 600, impact: 100, critRate: 0.05, critDmg: 0.5, dmgBonus: 0, pen: 0, penRatio: 0, resIgnore: 0, anomalyProficiency: 100, anomalyMastery: 100, energyRegen: 1.2 },
  skills: [{ id: 'support-ex', name: 'Support EX', type: 'EX Special', level: 12, attribute: 'Ether', duration: 1, hits: [{ multiplier: 1, at: 0.5 }], meta }],
  coreEffects: [{ id: 'fixture-team-buff', name: 'Fixture Team Buff', description: '+30% DMG à equipe por 10s após EX.', sourceType: 'agent', trigger: 'onEXSpecial', target: 'TEAM', modifiers: [{ stat: 'dmgBonus', value: 0.3 }], duration: 10, reapply: 'refresh', meta }],
  mindscapes: [], meta,
};

export const trainingStacker: AgentDefinition = {
  id: 'training-stacker', name: 'Training Stacker', rarity: 'A', attribute: 'Electric', specialty: 'Anomaly', faction: 'Test', maxLevel: 60,
  baseStats: { hp: 8000, atk: 2200, def: 600, impact: 90, critRate: 0.05, critDmg: 0.5, dmgBonus: 0, pen: 0, penRatio: 0, resIgnore: 0, anomalyProficiency: 300, anomalyMastery: 140, energyRegen: 1.2 },
  skills: [{ id: 'stack-hit', name: 'Stack Hit', type: 'Basic', level: 12, attribute: 'Electric', duration: 0.8, hits: [{ multiplier: 0.8, at: 0.4, anomalyBuildup: 50 }], meta }],
  coreEffects: [{ id: 'fixture-stack', name: 'Fixture Stacks', description: 'Cada hit concede 10% DMG, até 3 stacks, por 5s.', sourceType: 'agent', trigger: 'onHit', target: 'SELF', modifiers: [{ stat: 'dmgBonus', value: 0.1 }], duration: 5, maxStacks: 3, stacksPerTrigger: 1, reapply: 'refresh', meta }],
  mindscapes: [], meta,
};
