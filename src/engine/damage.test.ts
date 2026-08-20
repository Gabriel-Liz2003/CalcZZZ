import { describe, expect, it } from 'vitest';
import { calculateStandardDamage, defenseMultiplier, resistanceMultiplier } from './damage';
import type { CombatStats, EnemyState } from './types';

const stats: CombatStats = { hp:8000,atk:3000,def:600,impact:100,critRate:.5,critDmg:1,dmgBonus:.5,pen:0,penRatio:0,resIgnore:0,anomalyProficiency:100,anomalyMastery:100,energyRegen:1.2 };
const enemy: EnemyState = { id:'x',name:'x',level:60,def:794,res:{Physical:.1},resReduction:{},defReduction:0,defIgnore:0,dmgTaken:0,stunned:false,stunMultiplier:1.5,daze:0,maxDaze:100,debuffs:[] };

describe('damage formula',()=>{
  it('separa non-crit, crit e expected',()=>{const d=calculateStandardDamage({stats,enemy,skillMultiplier:1,attribute:'Physical'});expect(d.baseDamage).toBe(3000);expect(d.crit).toBeCloseTo(d.nonCrit*2);expect(d.expected).toBeCloseTo((d.nonCrit+d.crit)/2)});
  it('aplica DEF e PEN sem produzir defesa negativa',()=>{expect(defenseMultiplier(stats,enemy)).toBeCloseTo(.5);expect(defenseMultiplier({...stats,pen:99999},enemy)).toBe(1)});
  it('aplica DEF reduction e ignore separadamente',()=>{const reduced={...enemy,defReduction:.2,defIgnore:.25};expect(defenseMultiplier(stats,reduced)).toBeGreaterThan(.5)});
  it('suporta resistência positiva, negativa e alta',()=>{expect(resistanceMultiplier(stats,enemy,'Physical')).toBeCloseTo(.9);expect(resistanceMultiplier(stats,{...enemy,res:{Physical:-.2}},'Physical')).toBeCloseTo(1.1);expect(resistanceMultiplier(stats,{...enemy,res:{Physical:.8}},'Physical')).toBeCloseTo(.2)});
  it('aplica stun e vulnerability',()=>{const normal=calculateStandardDamage({stats,enemy,skillMultiplier:1,attribute:'Physical'});const stunned=calculateStandardDamage({stats,enemy:{...enemy,stunned:true,dmgTaken:.2},skillMultiplier:1,attribute:'Physical'});expect(stunned.expected/normal.expected).toBeCloseTo(1.8)});
  it('limita crit rate a 100%',()=>{const d=calculateStandardDamage({stats:{...stats,critRate:9},enemy,skillMultiplier:1,attribute:'Physical'});expect(d.expected).toBeCloseTo(d.crit)});
});
