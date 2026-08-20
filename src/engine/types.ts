export type Attribute = 'Physical' | 'Fire' | 'Ice' | 'Electric' | 'Ether' | 'Wind' | 'Lumiflux' | 'Other';
export type Specialty = 'Attack' | 'Anomaly' | 'Stun' | 'Support' | 'Defense' | 'Rupture' | 'Other';
export type SkillType = 'Basic' | 'Dodge' | 'Assist' | 'Special' | 'EX Special' | 'Chain' | 'Ultimate' | 'Aftershock' | 'Additional';

export interface CombatStats {
  atk: number;
  critRate: number;
  critDmg: number;
  dmgBonus: number;
  pen: number;
  penRatio: number;
  resIgnore: number;
  anomalyProficiency?: number;
  anomalyMastery?: number;
}

export interface EnemyState {
  def: number;
  res: number;
  resReduction: number;
  defReduction: number;
  defIgnore: number;
  dmgTaken: number;
  stunned: boolean;
  stunMultiplier: number;
}

export interface SkillDefinition {
  id: string;
  name: string;
  type: SkillType;
  multiplier: number;
  hits: number;
  duration: number;
  attribute: Attribute;
}

export interface AgentDefinition {
  id: string;
  name: string;
  rarity: 'S' | 'A';
  attribute: Attribute;
  specialty: Specialty;
  level: number;
  stats: CombatStats;
  skills: SkillDefinition[];
  source: string;
  dataVersion: string;
  lastUpdated: string;
}

export interface DamageBreakdown {
  baseDamage: number;
  dmgBonusMultiplier: number;
  defMultiplier: number;
  resMultiplier: number;
  dmgTakenMultiplier: number;
  stunMultiplier: number;
  nonCrit: number;
  crit: number;
  expected: number;
}

export interface Effect {
  id: string;
  name: string;
  trigger: 'always' | 'on_ex_special' | 'on_ultimate' | 'on_enter_field' | 'manual';
  target: 'self' | 'active_character' | 'team' | 'enemy';
  stat: 'atk' | 'critRate' | 'critDmg' | 'dmgBonus' | 'resReduction' | 'defReduction' | 'stunMultiplier';
  value: number;
  duration?: number;
  maxStacks?: number;
  condition?: (ctx: EffectContext) => boolean;
}

export interface EffectContext {
  activeAgentId: string;
  team: AgentDefinition[];
  time: number;
}

export interface TimedEffect {
  effect: Effect;
  sourceAgentId: string;
  startedAt: number;
  stacks: number;
}
