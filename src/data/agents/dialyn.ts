import type { AgentDefinition } from '../../engine/types';
import { GAME_DATA_VERSION, LAST_VERIFIED } from '../meta';

const wiki = 'https://zenless-zone-zero.fandom.com/wiki/Dialyn';
const meta = { gameVersion: GAME_DATA_VERSION, source: wiki, lastVerified: LAST_VERIFIED, verified: true } as const;

export const dialyn: AgentDefinition = {
  id: 'dialyn', name: 'Dialyn', rarity: 'S', attribute: 'Physical', specialty: 'Stun', faction: 'Krampus Compliance Authority', maxLevel: 60,
  baseStats: { hp: 8290, atk: 758, def: 612, impact: 136, critRate: 0.194, critDmg: 0.5, dmgBonus: 0, pen: 0, penRatio: 0, resIgnore: 0, anomalyProficiency: 93, anomalyMastery: 94, energyRegen: 1.2 },
  skills: [
    { id: 'ex-rock', name: 'EX Special: Rock', type: 'EX Special', level: 12, attribute: 'Physical', duration: 1.1, energyCost: 30, hits: [{ multiplier: 8.088, at: 0.72 }], meta },
    { id: 'ex-scissors', name: 'EX Special: Scissors', type: 'EX Special', level: 12, attribute: 'Physical', duration: 1.2, energyCost: 30, hits: [{ multiplier: 10.507, at: 0.78 }], meta },
    { id: 'ex-paper', name: 'EX Special: Paper!', type: 'EX Special', level: 12, attribute: 'Physical', duration: 1.3, energyCost: 30, hits: [{ multiplier: 14.035, at: 0.84 }], meta },
  ],
  coreEffects: [],
  additionalAbility: {
    id: 'dialyn-overwhelmingly-positive', name: 'Overwhelmingly Positive', description: 'Após EX Special, aumenta o DMG da equipe em 40% por 15s quando a composição cumpre a condição de especialidade.', sourceType: 'agent', trigger: 'onEXSpecial', target: 'TEAM', modifiers: [{ stat: 'dmgBonus', value: 0.4 }], duration: 15, reapply: 'refresh', condition: { op: 'or', conditions: [{ op: 'hasSpecialtyMember', specialty: 'Attack', excludingSelf: true }, { op: 'hasSpecialtyMember', specialty: 'Rupture', excludingSelf: true }] }, meta,
  },
  mindscapes: [],
  meta: { ...meta, notes: 'Dataset atual inclui os três EX Specials auditados e a Additional Ability. Demais skills/Mindscapes não são apresentados como verificados.' },
};
