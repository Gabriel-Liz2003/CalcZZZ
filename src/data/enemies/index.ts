import type { EnemyState } from '../../engine/types';
export const trainingDummy: EnemyState = { id: 'training-dummy', name: 'Training Dummy', level: 60, def: 953, res: { Physical: 0.1, Fire: 0.1, Ice: 0.1, Electric: 0.1, Ether: 0.1 }, resReduction: {}, defReduction: 0, defIgnore: 0, dmgTaken: 0, stunned: false, stunMultiplier: 1.5, daze: 0, maxDaze: 100, debuffs: [] };
export const enemyPresets: EnemyState[] = [trainingDummy];
