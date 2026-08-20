import type { WEngineDefinition } from '../../engine/types';
import { GAME_DATA_VERSION, LAST_VERIFIED } from '../meta';

const source = 'https://zenlessdb.com/w-engine/yesterday-calls';
const meta = { gameVersion: GAME_DATA_VERSION, source, sourceId: '14148', lastVerified: LAST_VERIFIED, verified: true } as const;

const dazeValues = [0.09, 0.103, 0.117, 0.13, 0.145];
const critValues = [0.30, 0.345, 0.39, 0.435, 0.48];
const energyValues = [1.5, 1.7, 1.9, 2.1, 2.3];

export const yesterdayCalls: WEngineDefinition = {
  id: 'yesterday-calls',
  name: 'Yesterday Calls',
  rarity: 'S',
  specialty: 'Stun',
  level: 60,
  baseAtk: 713.8,
  advancedStat: { stat: 'critRate', value: 0.24 },
  effects: [
    {
      id: 'yesterday-calls-offfield-energy', name: '24/7 — Off-field Energy', description: 'Enquanto fora de campo, Energy Regen +1.5~2.3/s.',
      sourceType: 'wengine', trigger: 'always', target: 'SELF', condition: { op: 'characterIsOffField' },
      modifiers: [{ stat: 'energyRegen', value: energyValues[0], refinementValues: energyValues }], meta,
    },
    {
      id: 'yesterday-calls-daze', name: '24/7 — Daze', description: 'Physical EX aumenta Daze em 9~14.5% por 10s, até 3 stacks.',
      sourceType: 'wengine', trigger: 'onEXSpecial', target: 'SELF',
      modifiers: [{ stat: 'dazeBonus', value: dazeValues[0], refinementValues: dazeValues }],
      duration: 10, maxStacks: 3, stacksPerTrigger: 1, reapply: 'refresh', meta,
    },
    {
      id: 'yesterday-calls-team-crit', name: '24/7 — Team CRIT DMG', description: 'Ao atingir 3 stacks de Daze, equipe ganha 30~48% CRIT DMG por 40s.',
      sourceType: 'wengine', trigger: 'onEXSpecial', target: 'TEAM', condition: { op: 'stackAtLeast', effectId: 'yesterday-calls-daze', count: 3 },
      modifiers: [{ stat: 'critDmg', value: critValues[0], refinementValues: critValues }], duration: 40, reapply: 'refresh', meta,
    },
  ],
  meta,
};

export const wengines: WEngineDefinition[] = [yesterdayCalls];
