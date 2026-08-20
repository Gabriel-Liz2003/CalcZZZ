import type { AgentDefinition, Effect } from '../engine/types';

export const GAME_DATA_VERSION = '3.1';
export const LAST_UPDATED = '2026-08-20';

export const dialyn: AgentDefinition = {
  id: 'dialyn',
  name: 'Dialyn',
  rarity: 'S',
  attribute: 'Physical',
  specialty: 'Stun',
  level: 60,
  stats: {
    atk: 758,
    critRate: 0.194,
    critDmg: 0.5,
    dmgBonus: 0,
    pen: 0,
    penRatio: 0,
    resIgnore: 0,
    anomalyProficiency: 93,
    anomalyMastery: 94,
  },
  skills: [
    { id: 'rock', name: 'EX Special: Rock', type: 'EX Special', multiplier: 8.088, hits: 1, duration: 1.1, attribute: 'Physical' },
    { id: 'scissors', name: 'EX Special: Scissors', type: 'EX Special', multiplier: 10.507, hits: 1, duration: 1.2, attribute: 'Physical' },
    { id: 'paper', name: 'EX Special: Paper!', type: 'EX Special', multiplier: 14.035, hits: 1, duration: 1.3, attribute: 'Physical' },
  ],
  source: 'https://zenless-zone-zero.fandom.com/wiki/Dialyn',
  dataVersion: GAME_DATA_VERSION,
  lastUpdated: LAST_UPDATED,
};

export const trainingAttacker: AgentDefinition = {
  id: 'training-attacker',
  name: 'Training Attacker',
  rarity: 'A',
  attribute: 'Physical',
  specialty: 'Attack',
  level: 60,
  stats: {
    atk: 3000,
    critRate: 0.7,
    critDmg: 1.4,
    dmgBonus: 0.5,
    pen: 0,
    penRatio: 0,
    resIgnore: 0,
    anomalyProficiency: 100,
    anomalyMastery: 100,
  },
  skills: [{ id: 'test-hit', name: 'Test Hit', type: 'Basic', multiplier: 1, hits: 1, duration: 1, attribute: 'Physical' }],
  source: 'Internal deterministic fixture — not game data',
  dataVersion: GAME_DATA_VERSION,
  lastUpdated: LAST_UPDATED,
};

export const dialynAdditionalAbility: Effect = {
  id: 'dialyn-overwhelmingly-positive',
  name: 'Overwhelmingly Positive',
  trigger: 'on_ex_special',
  target: 'team',
  stat: 'dmgBonus',
  value: 0.4,
  duration: 15,
  condition: (ctx) => ctx.team.some((agent) => agent.specialty === 'Attack' || agent.specialty === 'Rupture'),
};

export const dialynExCritDmg: Effect = {
  id: 'dialyn-ex-crit-dmg',
  name: 'External Line — EX CRIT DMG',
  trigger: 'always',
  target: 'self',
  stat: 'critDmg',
  value: 0.5,
  condition: (ctx) => ctx.team.some((agent) => agent.specialty === 'Attack' || agent.specialty === 'Rupture'),
};

export const agents = [dialyn, trainingAttacker];
