import { describe,expect,it } from 'vitest';
import { evaluateCondition } from './conditions';
import { createCombatState } from './rotation';
import { trainingAttacker,trainingSupport } from '../data/agents/fixtures';
import { trainingDummy } from '../data/enemies';

describe('conditions',()=>{it('AND OR NOT e composição',()=>{const state=createCombatState([trainingSupport,trainingAttacker],trainingDummy);const ctx={state,sourceAgentId:trainingSupport.id};expect(evaluateCondition({op:'and',conditions:[{op:'hasSpecialtyMember',specialty:'Attack',excludingSelf:true},{op:'not',condition:{op:'enemyIsStunned'}}]},ctx)).toBe(true);expect(evaluateCondition({op:'or',conditions:[{op:'hasAttributeMember',attribute:'Fire'},{op:'hasAttributeMember',attribute:'Physical'}]},ctx)).toBe(true)});it('energia e previous action',()=>{let state=createCombatState([trainingAttacker],trainingDummy);state.characterStates[trainingAttacker.id].energy=80;state.lastAction={agentId:trainingAttacker.id,skillType:'Basic',at:0};const ctx={state,sourceAgentId:trainingAttacker.id};expect(evaluateCondition({op:'energyAtLeast',amount:60},ctx)).toBe(true);expect(evaluateCondition({op:'previousActionIs',skillType:'Basic'},ctx)).toBe(true)})});
