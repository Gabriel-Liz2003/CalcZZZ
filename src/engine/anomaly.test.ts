import { describe, expect, it } from 'vitest';
import { addAnomalyBuildup, anomalyLevelMultiplier, buildupAmount, calculateDisorder, disorderCoefficient, emptyAnomalyState, processTimedAnomaly, thresholdFor, triggerReactiveAnomalyTick } from './anomaly';
import type { ActiveAnomaly, AnomalyDefinition, CombatStats, EnemyState } from './types';

const meta={gameVersion:'test',source:'test',lastVerified:'test',verified:true};
const stats:CombatStats={hp:8000,atk:3000,def:600,impact:100,critRate:.5,critDmg:1,dmgBonus:0,pen:0,penRatio:0,resIgnore:0,anomalyProficiency:100,anomalyMastery:100,energyRegen:1.2};
const enemy:EnemyState={id:'x',name:'x',level:60,def:0,res:{Physical:0,Fire:0,Electric:0,Ether:0,Ice:0},resReduction:{},defReduction:0,defIgnore:0,dmgTaken:0,stunned:false,stunMultiplier:1.5,daze:0,maxDaze:100,debuffs:[],anomalyThreshold:{Physical:100,Fire:100,Electric:100,Ether:100,Ice:100}};
const physical:AnomalyDefinition={attribute:'Physical',threshold:720,baseMultiplier:7.13,duration:10,meta};
const fire:AnomalyDefinition={attribute:'Fire',threshold:600,baseMultiplier:0,duration:10,tickInterval:.5,tickMultiplier:.5,maxTicks:20,meta};
const shock:AnomalyDefinition={attribute:'Electric',threshold:600,baseMultiplier:0,duration:10,tickInterval:1,tickMultiplier:1.25,maxTicks:10,reactiveTicks:true,meta};
const ether:AnomalyDefinition={attribute:'Ether',threshold:600,baseMultiplier:0,duration:10,tickInterval:.5,tickMultiplier:.625,maxTicks:20,reactiveTicks:true,meta};

describe('anomaly',()=>{
  it('AM escala buildup e buildup RES',()=>{expect(buildupAmount(50,140)).toBeCloseTo(70);expect(buildupAmount(50,140,.2,.1)).toBeCloseTo(75.6)});
  it('level multiplier é 1 no Lv1 e 2 no Lv60',()=>{expect(anomalyLevelMultiplier(1)).toBe(1);expect(anomalyLevelMultiplier(60)).toBe(2)});
  it('threshold aumenta 2% por aplicação até 10 stacks',()=>{expect(thresholdFor(fire,{...enemy,anomalyThreshold:{Fire:100}},0)).toBe(100);expect(thresholdFor(fire,{...enemy,anomalyThreshold:{Fire:100}},1)).toBeCloseTo(102);expect(thresholdFor(fire,{...enemy,anomalyThreshold:{Fire:100}},99)).toBeCloseTo(100*Math.pow(1.02,9))});
  it('proc preserva contribuição ponderada',()=>{let state=emptyAnomalyState();let r=addAnomalyBuildup({state,definition:physical,agentId:'a',stats,baseBuildup:60,now:0,enemy});expect(r.procDamage).toBe(0);state=r.state;r=addAnomalyBuildup({state,definition:physical,agentId:'b',stats:{...stats,atk:4000,anomalyProficiency:200},baseBuildup:50,now:1,enemy});expect(r.procDamage).toBeGreaterThan(0);expect(r.applied?.contributions).toHaveLength(2)});
  it('Burn gera 20 ticks de 50% em 10s',()=>{const applied=addAnomalyBuildup({state:emptyAnomalyState(),definition:fire,agentId:'a',stats,baseBuildup:100,now:0,enemy});const processed=processTimedAnomaly(applied.state,[fire],0,10,enemy);expect(processed.ticks).toHaveLength(20);expect(processed.ticks.reduce((s,t)=>s+t.damage,0)).toBeCloseTo(3000*.5*2*20)});
  it('Shock é reativo e respeita ICD de 1s',()=>{let r=addAnomalyBuildup({state:emptyAnomalyState(),definition:shock,agentId:'a',stats,baseBuildup:100,now:0,enemy});let t=triggerReactiveAnomalyTick(r.state,[shock],.5,enemy);expect(t.tick).toBeUndefined();t=triggerReactiveAnomalyTick(t.state,[shock],1,enemy);expect(t.tick?.damage).toBeGreaterThan(0);const again=triggerReactiveAnomalyTick(t.state,[shock],1.5,enemy);expect(again.tick).toBeUndefined()});
  it('Corruption usa ICD de 0.5s',()=>{let r=addAnomalyBuildup({state:emptyAnomalyState(),definition:ether,agentId:'a',stats,baseBuildup:100,now:0,enemy});const t=triggerReactiveAnomalyTick(r.state,[ether],.5,enemy);expect(t.tick?.damage).toBeGreaterThan(0)});
  it('Disorder Burn cedo > Burn quase expirado',()=>{expect(disorderCoefficient('Fire',9)).toBeCloseTo(13.5);expect(disorderCoefficient('Fire',.4)).toBeCloseTo(4.5)});
  it('Disorder Shock cedo > Shock quase expirado',()=>{expect(disorderCoefficient('Electric',9)).toBeCloseTo(15.75);expect(disorderCoefficient('Electric',.9)).toBeCloseTo(4.5)});
  it('Disorder Corruption cedo > tarde',()=>{expect(disorderCoefficient('Ether',9)).toBeCloseTo(15.75);expect(disorderCoefficient('Ether',.4)).toBeCloseTo(4.5)});
  it('Disorder Physical usa 7.5% por segundo restante',()=>{expect(disorderCoefficient('Physical',9)).toBeCloseTo(5.175);expect(disorderCoefficient('Physical',1)).toBeCloseTo(4.575)});
  it('calculateDisorder usa contribuição anterior e tempo restante',()=>{const contribution={agentId:'a',buildup:100,ap:100,atk:3000,level:60,dmgBonus:0,pen:0,penRatio:0,resIgnore:0};const previous:ActiveAnomaly={attribute:'Fire',appliedAt:0,expiresAt:10,contributions:[contribution]};expect(calculateDisorder(previous,1,enemy)).toBeGreaterThan(calculateDisorder(previous,9.6,enemy))});
});
