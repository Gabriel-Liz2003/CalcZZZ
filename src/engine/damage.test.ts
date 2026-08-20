import { describe, expect, it } from 'vitest';
import { calculateStandardDamage, defenseBreakdown, defenseMultiplier, levelFactorFor, resistanceMultiplier } from './damage';
import type { CombatStats, EnemyState } from './types';

const stats: CombatStats = { hp:8000,atk:3000,def:600,impact:100,critRate:.5,critDmg:1,dmgBonus:.5,pen:0,penRatio:0,resIgnore:0,anomalyProficiency:100,anomalyMastery:100,energyRegen:1.2 };
const enemy: EnemyState = { id:'x',name:'x',level:60,def:794,res:{Physical:.1},resReduction:{},defReduction:0,defIgnore:0,dmgTaken:0,stunned:false,stunMultiplier:1.5,daze:0,maxDaze:100,debuffs:[] };

describe('damage formula',()=>{
  it('separa non-crit, crit e expected',()=>{const d=calculateStandardDamage({stats,enemy,skillMultiplier:1,attribute:'Physical'});expect(d.baseDamage).toBe(3000);expect(d.crit).toBeCloseTo(d.nonCrit*2);expect(d.expected).toBeCloseTo((d.nonCrit+d.crit)/2)});
  it('aplica DEF e PEN sem produzir defesa negativa',()=>{expect(defenseMultiplier(stats,enemy)).toBeCloseTo(.5);expect(defenseMultiplier({...stats,pen:99999},enemy)).toBe(1)});
  it('combina DEF reduction + ignore antes de PEN ratio e flat PEN',()=>{
    const detailed=defenseBreakdown({...stats,penRatio:.24,pen:9},{...enemy,def:953,defReduction:.4,defIgnore:.12},60);
    expect(detailed.baseDefense).toBe(953);
    expect(detailed.combinedShred).toBeCloseTo(.52);
    expect(detailed.afterDefReductionAndIgnore).toBeCloseTo(457.44);
    expect(detailed.afterPenRatio).toBeCloseTo(347.6544);
    expect(detailed.afterFlatPen).toBeCloseTo(338.6544);
    expect(detailed.multiplier).toBeCloseTo(794/(794+338.6544));
  });
  it('usa level factor real do atacante',()=>{
    expect(levelFactorFor(1)).toBe(50);
    expect(levelFactorFor(20)).toBe(172);
    expect(levelFactorFor(40)).toBe(421);
    expect(levelFactorFor(60)).toBe(794);
    expect(defenseMultiplier(stats,enemy,40)).toBeCloseTo(421/(421+794));
  });
  it('RES 20% sem reduction = 0.80',()=>expect(resistanceMultiplier(stats,{...enemy,res:{Physical:.2},resReduction:{}},'Physical')).toBeCloseTo(.8));
  it('RES 20% com 10% reduction = 0.90',()=>expect(resistanceMultiplier(stats,{...enemy,res:{Physical:.2},resReduction:{Physical:.1}},'Physical')).toBeCloseTo(.9));
  it('RES 0 com 20% reduction = 1.20',()=>expect(resistanceMultiplier(stats,{...enemy,res:{Physical:0},resReduction:{Physical:.2}},'Physical')).toBeCloseTo(1.2));
  it('RES negativa é linear e não usa curva de Genshin',()=>expect(resistanceMultiplier(stats,{...enemy,res:{Physical:-.2},resReduction:{}},'Physical')).toBeCloseTo(1.2));
  it('RES alta permanece linear',()=>expect(resistanceMultiplier(stats,{...enemy,res:{Physical:.8},resReduction:{}},'Physical')).toBeCloseTo(.2));
  it('aplica stun e vulnerability',()=>{const normal=calculateStandardDamage({stats,enemy,skillMultiplier:1,attribute:'Physical'});const stunned=calculateStandardDamage({stats,enemy:{...enemy,stunned:true,dmgTaken:.2},skillMultiplier:1,attribute:'Physical'});expect(stunned.expected/normal.expected).toBeCloseTo(1.8)});
  it('limita crit rate a 100%',()=>{const d=calculateStandardDamage({stats:{...stats,critRate:9},enemy,skillMultiplier:1,attribute:'Physical'});expect(d.expected).toBeCloseTo(d.crit)});
  it('nunca retorna NaN/Infinity para inputs inválidos',()=>{
    const d=calculateStandardDamage({stats:{...stats,atk:Number.NaN,critRate:Number.POSITIVE_INFINITY},enemy:{...enemy,def:Number.NaN},skillMultiplier:Number.POSITIVE_INFINITY,attribute:'Physical'});
    for(const value of Object.values(d).filter((v):v is number=>typeof v==='number')) expect(Number.isFinite(value)).toBe(true);
  });
});
