import type { DriveDiscDefinition } from '../../engine/types';
import { GAME_DATA_VERSION, INTERNAL_SOURCE, LAST_VERIFIED } from '../meta';
const meta = { gameVersion: GAME_DATA_VERSION, source: INTERNAL_SOURCE, lastVerified: LAST_VERIFIED, verified: true, notes: 'Fixture de teste; não é Drive Disc do jogo.' } as const;
export const driveDiscs: DriveDiscDefinition[] = [{
  id: 'training-disc', name: 'Training Disc',
  twoPiece: [{ id: 'training-disc-2pc', name: '2-pc', description: '+10% DMG.', sourceType: 'disc', trigger: 'always', target: 'SELF', modifiers: [{ stat: 'dmgBonus', value: 0.1 }], meta }],
  fourPiece: [{ id: 'training-disc-4pc', name: '4-pc', description: '+20% CRIT DMG após EX por 10s.', sourceType: 'disc', trigger: 'onEXSpecial', target: 'SELF', modifiers: [{ stat: 'critDmg', value: 0.2 }], duration: 10, reapply: 'refresh', meta }], meta,
}];
