import type { WEngineDefinition } from '../../engine/types';
import { GAME_DATA_VERSION, INTERNAL_SOURCE, LAST_VERIFIED } from '../meta';
const meta = { gameVersion: GAME_DATA_VERSION, source: INTERNAL_SOURCE, lastVerified: LAST_VERIFIED, verified: true, notes: 'Fixture de teste; não é W-Engine do jogo.' } as const;
export const wengines: WEngineDefinition[] = [{
  id: 'training-engine', name: 'Training Engine', rarity: 'A', specialty: 'Attack', level: 60, baseAtk: 100, advancedStat: { stat: 'critRate', value: 0.1 }, refinementValues: [1, 1.25, 1.5, 1.75, 2],
  effects: [{ id: 'training-engine-effect', name: 'Training Engine Passive', description: '+10% DMG após Basic por 8s (R1).', sourceType: 'wengine', trigger: 'onBasicAttack', target: 'SELF', modifiers: [{ stat: 'dmgBonus', value: 0.1 }], duration: 8, reapply: 'refresh', meta }], meta,
}];
