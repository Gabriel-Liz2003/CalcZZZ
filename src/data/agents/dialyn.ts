import type { AgentDefinition, EffectDefinition, SkillHit } from '../../engine/types';
import { GAME_DATA_VERSION, LAST_VERIFIED } from '../meta';

const source = 'https://zzz.honeyhunterworld.com/1481-char/?lang=EN';
const skillSource = 'https://zenlessdb.com/character/dialyn/skills';
const meta = { gameVersion: GAME_DATA_VERSION, source, sourceId: '1481', lastVerified: LAST_VERIFIED, verified: true } as const;
const skillMeta = { gameVersion: GAME_DATA_VERSION, source: skillSource, sourceId: '1481', lastVerified: LAST_VERIFIED, verified: false, notes: 'DMG/Daze/Energy values verified; action duration/hit timestamps are normalized theorycraft timings and may be overridden per rotation until frame data is sourced.' } as const;

const composition = { op: 'or', conditions: [
  { op: 'hasSpecialtyMember', specialty: 'Attack', excludingSelf: true },
  { op: 'hasSpecialtyMember', specialty: 'Rupture', excludingSelf: true },
] } as const;

const overwhelmingPositive = (trigger: 'onEXSpecial'|'onUltimate'): EffectDefinition => ({
  id: 'dialyn-overwhelming-positive',
  name: 'Overwhelmingly Positive',
  description: 'EX Special/Ultimate: all squad members deal +40% DMG for 15s. If reapplied with <35s remaining, extends by 10s.',
  sourceType: 'agent', trigger, target: 'TEAM', modifiers: [{ stat: 'dmgBonus', value: 0.4 }], duration: 15,
  reapply: 'extend', extendBy: 10, extendIfRemainingBelow: 35, condition: composition, meta,
});

function hit(multiplier:number, dazeMultiplier:number, at=1, heavy=false, multiplierGrowth?:number, dazeGrowth?:number):SkillHit {
  return { multiplier, dazeMultiplier, at, heavy, multiplierGrowth, dazeGrowth };
}

export const dialyn: AgentDefinition = {
  id: 'dialyn', name: 'Dialyn', rarity: 'S', attribute: 'Physical', specialty: 'Stun', faction: 'Krampus Compliance Authority', maxLevel: 60,
  // Natural Lv60 stats before Core enhancement stat nodes.
  baseStats: { hp: 8251, atk: 683.2, def: 612.6, impact: 110, critRate: 0.05, critDmg: 0.5, dmgBonus: 0, pen: 0, penRatio: 0, resIgnore: 0, anomalyProficiency: 93, anomalyMastery: 94, energyRegen: 1.2 },
  // Fully enhanced Core nodes: +74.8 ATK and +14.4% CRIT Rate, yielding 758 ATK / 19.4% CRIT shown on full-build stat references.
  staticBonuses: { atk: 74.8, critRate: 0.144 },
  skills: [
    { id:'basic-happy', name:'Basic Attack: Happy to Be of Service', type:'Basic', level:12, attribute:'Physical', duration:1,
      hits:[hit(.52,.293,.25,false,.024,.009),hit(1.03,.655,.5,false,.047,.02),hit(1.297,.924,.75,false,.059,.028),hit(1.996,1.501,1,true,.091,.046)], meta:skillMeta },
    { id:'basic-rps-12', name:'Basic Attack: Rock, Paper, Scissors (1–2)', type:'Basic', level:12, attribute:'Physical', duration:1,
      hits:[hit(1.797,1.077,.5,false,.082,.033),hit(2.283,1.37,1,true,.104,.042)], meta:skillMeta },
    { id:'basic-rps-34', name:'Basic Attack: Rock, Paper, Scissors (3–4)', type:'Basic', level:12, attribute:'Physical', duration:1,
      hits:[hit(2.065,1.24,.5,false,.094,.038),hit(2.015,1.207,1,true,.092,.037)], meta:skillMeta },
    { id:'dash-sudden-call', name:'Dash Attack: Sudden Call', type:'Dash', level:12, attribute:'Physical', duration:1, hits:[hit(1.21,.457,1,true,.055,.014)], meta:skillMeta },
    { id:'dodge-counter', name:'Dodge Counter: Number Unavailable', type:'Dodge Counter', level:12, attribute:'Physical', duration:1, hits:[hit(5.346,3.465,1,true,.243,.105)], meta:skillMeta },
    { id:'special-welcome', name:'Special Attack: Welcome Gesture', type:'Special', level:12, attribute:'Physical', duration:1, hits:[hit(1.092,.817,1,true,.05,.025)], meta:skillMeta },
    { id:'ex-get-lost', name:'EX Special Attack: Get Lost!', type:'EX Special', level:12, attribute:'Physical', duration:1, hits:[hit(10.997,5.048,1,true,.5,.153)], specialProperties:['Consumes Customer Complaint','Quick Assist'], meta:skillMeta },
    { id:'ex-rock', name:'EX Special Attack: Rock', type:'EX Special', level:12, attribute:'Physical', duration:1, energyCost:25, hits:[hit(8.088,3.548,1,true,.368,.108)], meta:skillMeta },
    { id:'ex-scissors', name:'EX Special Attack: Scissors', type:'EX Special', level:12, attribute:'Physical', duration:1, energyCost:25, hits:[hit(10.507,4.653,1,true,.478,.141)], meta:skillMeta },
    { id:'ex-paper', name:'EX Special Attack: Paper!', type:'EX Special', level:12, attribute:'Physical', duration:1, energyCost:25, hits:[hit(14.035,6.414,1,true,.638,.195)], specialProperties:['Applies Malicious Complaint'], meta:skillMeta },
    { id:'chain-welcome-mat', name:'Chain Attack: Welcome Mat', type:'Chain', level:12, attribute:'Physical', duration:1, hits:[hit(12.408,2.728,1,true,.564,.083)], meta:skillMeta },
    { id:'ultimate-service-stopped', name:'Ultimate: Service Stopped for Number Dialed', type:'Ultimate', level:12, attribute:'Physical', duration:1, hits:[hit(32.45,11.517,1,true,1.475,.349)], meta:skillMeta },
    { id:'quick-assist', name:'Quick Assist: Forward Call', type:'Assist', level:12, attribute:'Physical', duration:1, hits:[hit(2.42,.913,1,true,.11,.028)], meta:skillMeta },
    { id:'assist-follow-up', name:'Assist Follow-Up: Back-to-Back Calls', type:'Assist', level:12, attribute:'Physical', duration:1, hits:[hit(7.537,4.916,1,true,.343,.149)], meta:skillMeta },
  ],
  coreEffects: [
    overwhelmingPositive('onUltimate'),
    {
      id:'dialyn-malicious-stun-mult', name:'Malicious Complaint — Stun Multiplier', description:'Target under Malicious Complaint gains +30% Stun DMG Multiplier when Stunned.',
      sourceType:'agent', trigger:'always', target:'ENEMY', modifiers:[{stat:'stunMultiplier',value:.30}], condition:{op:'enemyHasDebuff',debuff:'malicious-complaint'}, meta,
    },
  ],
  additionalAbility: overwhelmingPositive('onEXSpecial'),
  mindscapes: [
    { level:1, name:'Boundless Hospitality', description:'Positive Review gain +16%; while Overwhelmingly Positive is active, characters ignore 15% All-Attribute RES.',
      effects:[{id:'dialyn-m1-res-ignore',name:'M1 RES Ignore',description:'15% All-Attribute RES Ignore while Overwhelmingly Positive is active.',sourceType:'mindscape',trigger:'always',target:'TEAM',modifiers:[{stat:'resIgnore',value:.15}],condition:{op:'stackAtLeast',effectId:'dialyn-overwhelming-positive',count:1},meta}], meta },
    { level:2, name:'24/7 Hotline', description:'Malicious Complaint: +20% extra Stun DMG Multiplier and +15% DMG taken.',
      effects:[
        {id:'dialyn-m2-stun',name:'M2 Malicious Complaint Stun',description:'+20% Stun DMG Multiplier.',sourceType:'mindscape',trigger:'always',target:'ENEMY',modifiers:[{stat:'stunMultiplier',value:.20}],condition:{op:'enemyHasDebuff',debuff:'malicious-complaint'},meta},
        {id:'dialyn-m2-vulnerability',name:'M2 Malicious Complaint Vulnerability',description:'+15% DMG taken.',sourceType:'mindscape',trigger:'always',target:'ENEMY',modifiers:[{stat:'enemyDmgTaken',value:.15}],condition:{op:'enemyHasDebuff',debuff:'malicious-complaint'},meta},
      ], meta },
    { level:3, name:'Call From the Hollow', description:'Basic, Dodge, Assist, Special and Chain Lv. +2.', effects:[], skillLevelBonuses:{Basic:2,Dodge:2,Assist:2,Special:2,'EX Special':2,Chain:2,Ultimate:2}, meta },
    { level:4, name:'The Past Never Fades', description:'Entering combat restores 20 Energy. While Overwhelmingly Positive is active, Dialyn ATK +500.',
      effects:[{id:'dialyn-m4-atk',name:'M4 ATK',description:'+500 ATK while Overwhelmingly Positive is active.',sourceType:'mindscape',trigger:'always',target:'SELF',modifiers:[{stat:'atk',value:500}],condition:{op:'stackAtLeast',effectId:'dialyn-overwhelming-positive',count:1},meta}], meta },
    { level:5, name:'Lies', description:'Basic, Dodge, Assist, Special and Chain Lv. +2.', effects:[], skillLevelBonuses:{Basic:2,Dodge:2,Assist:2,Special:2,'EX Special':2,Chain:2,Ultimate:2}, meta },
    { level:6, name:'Truth', description:'Core-upgraded ally Ultimate grants Aftertone; hits trigger Dialyn 480% ATK Physical EX DMG once/s, up to 12 times.', effects:[], meta },
  ],
  meta: { ...meta, notes:'Natural Lv60 base stats are separated from Core enhancement static bonuses. Skill multipliers/daze/energy and M1–M6 are sourced; animation timing remains explicitly overrideable.' },
};
