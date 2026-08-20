import { describe,expect,it } from 'vitest';
import { addAnomalyBuildup,buildupAmount,emptyAnomalyState } from './anomaly';
import { trainingAttacker } from '../data/agents/fixtures';
import { trainingDummy } from '../data/enemies';
import type { AnomalyDefinition } from './types';
const meta={gameVersion:'test',source:'test',lastVerified:'test',verified:true};
const physical:AnomalyDefinition={attribute:'Physical',threshold:100,baseMultiplier:7,duration:4,disorderBaseMultiplier:4,meta};
const fire:AnomalyDefinition={attribute:'Fire',threshold:100,baseMultiplier:8,duration:10,disorderBaseMultiplier:4,meta};
describe('anomaly',()=>{it('AM escala buildup',()=>expect(buildupAmount(50,140)).toBeCloseTo(70));it('proc preserva contribuição ponderada',()=>{let state=emptyAnomalyState();let r=addAnomalyBuildup({state,definition:physical,agentId:'a',stats:{...trainingAttacker.baseStats,anomalyMastery:100},baseBuildup:60,now:0,enemy:trainingDummy});expect(r.procDamage).toBe(0);state=r.state;r=addAnomalyBuildup({state,definition:physical,agentId:'b',stats:{...trainingAttacker.baseStats,atk:4000,anomalyProficiency:200,anomalyMastery:100},baseBuildup:50,now:1,enemy:trainingDummy});expect(r.procDamage).toBeGreaterThan(0);expect(r.applied?.contributions).toHaveLength(2)});it('Disorder usa status anterior restante',()=>{let r=addAnomalyBuildup({state:emptyAnomalyState(),definition:physical,agentId:'a',stats:trainingAttacker.baseStats,baseBuildup:100,now:0,enemy:trainingDummy});const fireStats={...trainingAttacker.baseStats};const d=addAnomalyBuildup({state:r.state,definition:fire,agentId:'a',stats:fireStats,baseBuildup:100,now:1,enemy:trainingDummy});expect(d.disorderDamage).toBeGreaterThan(0)})});
