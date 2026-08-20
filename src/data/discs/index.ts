import type { DriveDiscDefinition, EffectDefinition } from '../../engine/types';
import { GAME_DATA_VERSION, LAST_VERIFIED } from '../meta';

const kingSource='https://zzz.gg/disk-drives/king-of-the-summit';
const woodSource='https://zzz.honeyhunterworld.com/drive-disks/?lang=EN';
const kingMeta={gameVersion:GAME_DATA_VERSION,source:kingSource,sourceId:'33200',lastVerified:LAST_VERIFIED,verified:true} as const;
const woodMeta={gameVersion:GAME_DATA_VERSION,source:woodSource,lastVerified:LAST_VERIFIED,verified:true} as const;

const kingBase=(trigger:'onEXSpecial'|'onChainAttack'):EffectDefinition=>({
  id:'king-summit-team-crit-base',name:'King of the Summit — Team CRIT DMG',description:'Stun Agent EX/Chain: squad CRIT DMG +15% for 15s.',sourceType:'disc',trigger,target:'TEAM',
  modifiers:[{stat:'critDmg',value:.15}],duration:15,reapply:'refresh',condition:{op:'sourceHasSpecialty',specialty:'Stun'},meta:kingMeta,
});
const kingExtra=(trigger:'onEXSpecial'|'onChainAttack'):EffectDefinition=>({
  id:'king-summit-team-crit-extra',name:'King of the Summit — 50% CRIT bonus',description:'Additional +15% squad CRIT DMG if equipper static CRIT Rate ≥50%.',sourceType:'disc',trigger,target:'TEAM',
  modifiers:[{stat:'critDmg',value:.15}],duration:15,reapply:'refresh',condition:{op:'and',conditions:[{op:'sourceHasSpecialty',specialty:'Stun'},{op:'sourceStatAtLeast',stat:'critRate',value:.5}]},meta:kingMeta,
});

export const kingOfTheSummit:DriveDiscDefinition={
  id:'king-of-the-summit',name:'King of the Summit',
  twoPiece:[{id:'king-summit-2pc',name:'King of the Summit 2pc',description:'Daze dealt +6%.',sourceType:'disc',trigger:'always',target:'SELF',modifiers:[{stat:'dazeBonus',value:.06}],meta:kingMeta}],
  fourPiece:[kingBase('onEXSpecial'),kingBase('onChainAttack'),kingExtra('onEXSpecial'),kingExtra('onChainAttack')],meta:kingMeta,
};

const woodBuff=(skillType:'Basic'|'Dodge Counter'|'EX Special',id:string):EffectDefinition=>({
  id,name:`Woodpecker Electro — ${skillType}`,description:`CRIT com ${skillType}: ATK +9% por 6s; duração independente.`,sourceType:'disc',trigger:'onCrit',target:'SELF',
  modifiers:[{stat:'atk',value:.09,mode:'multiply'}],duration:6,reapply:'refresh',condition:{op:'currentSkillTypeIs',skillType},meta:woodMeta,
});
export const woodpeckerElectro:DriveDiscDefinition={
  id:'woodpecker-electro',name:'Woodpecker Electro',
  twoPiece:[{id:'woodpecker-2pc',name:'Woodpecker Electro 2pc',description:'CRIT Rate +8%.',sourceType:'disc',trigger:'always',target:'SELF',modifiers:[{stat:'critRate',value:.08}],meta:woodMeta}],
  fourPiece:[woodBuff('Basic','woodpecker-basic'),woodBuff('Dodge Counter','woodpecker-dodge-counter'),woodBuff('EX Special','woodpecker-ex')],meta:woodMeta,
};

export const driveDiscs:DriveDiscDefinition[]=[kingOfTheSummit,woodpeckerElectro];
