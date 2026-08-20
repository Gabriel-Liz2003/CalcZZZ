export type Attribute = 'Physical' | 'Fire' | 'Ice' | 'Electric' | 'Ether' | 'Wind' | 'Auric Ink' | 'Other';
export type Specialty = 'Attack' | 'Anomaly' | 'Stun' | 'Support' | 'Defense' | 'Rupture' | 'Other';
export type SkillType = 'Basic' | 'Dodge' | 'Dash' | 'Dodge Counter' | 'Assist' | 'Special' | 'EX Special' | 'Chain' | 'Ultimate' | 'Aftershock' | 'Additional' | 'Core' | 'Switch' | 'Wait';
export type Trigger = 'onBattleStart' | 'onEnterField' | 'onLeaveField' | 'onHit' | 'onCrit' | 'onBasicAttack' | 'onSpecial' | 'onEXSpecial' | 'onUltimate' | 'onChainAttack' | 'onAssist' | 'onDodge' | 'onAnomaly' | 'onDisorder' | 'onStun' | 'onStackGain' | 'manual' | 'always';
export type EffectTarget = 'SELF' | 'ACTIVE_CHARACTER' | 'TEAM' | 'SPECIFIC_CHARACTER' | 'ENEMY';
export type ReapplyPolicy = 'refresh' | 'replace' | 'extend' | 'ignore';
export type ModifierMode = 'add' | 'multiply' | 'override';
export type StatKey = keyof CombatStats | 'enemyDefReduction' | 'enemyResReduction' | 'enemyDmgTaken' | 'stunMultiplier' | 'skillMultiplier';

export interface DataMeta { gameVersion: string; source: string; lastVerified: string; verified: boolean; notes?: string; }
export interface CombatStats { hp:number; atk:number; def:number; impact:number; critRate:number; critDmg:number; dmgBonus:number; pen:number; penRatio:number; resIgnore:number; anomalyProficiency:number; anomalyMastery:number; energyRegen:number; }
export interface EnemyState { id:string; name:string; level:number; def:number; res:Partial<Record<Attribute,number>>; resReduction:Partial<Record<Attribute,number>>; defReduction:number; defIgnore:number; dmgTaken:number; stunned:boolean; stunMultiplier:number; daze:number; maxDaze:number; debuffs:string[]; }
export interface SkillHit { multiplier:number; at:number; anomalyBuildup?:number; dazeMultiplier?:number; canCrit?:boolean; }
export interface SkillDefinition { id:string; name:string; type:SkillType; level:number; attribute:Attribute; duration:number; energyCost?:number; hits:SkillHit[]; specialProperties?:string[]; meta:DataMeta; }
export type Condition =
  | { op:'always' }
  | { op:'and'; conditions:Condition[] }
  | { op:'or'; conditions:Condition[] }
  | { op:'not'; condition:Condition }
  | { op:'hasFactionMember'; faction:string; excludingSelf?:boolean }
  | { op:'hasAttributeMember'; attribute:Attribute; excludingSelf?:boolean }
  | { op:'hasSpecialtyMember'; specialty:Specialty; excludingSelf?:boolean }
  | { op:'enemyIsStunned'; value?:boolean }
  | { op:'enemyHasDebuff'; debuff:string }
  | { op:'characterIsActive' }
  | { op:'characterIsOffField' }
  | { op:'stackAtLeast'; effectId:string; count:number }
  | { op:'energyAtLeast'; amount:number }
  | { op:'previousActionIs'; skillType:SkillType }
  | { op:'timeSinceTriggerAtMost'; trigger:Trigger; seconds:number };
export interface EffectModifier { stat:StatKey; value:number; mode?:ModifierMode; attribute?:Attribute; }
export interface EffectDefinition { id:string; name:string; description:string; sourceType:'agent'|'mindscape'|'wengine'|'disc'|'enemy'|'manual'; trigger:Trigger; target:EffectTarget; specificCharacterId?:string; modifiers:EffectModifier[]; condition?:Condition; duration?:number; maxStacks?:number; stacksPerTrigger?:number; cooldown?:number; reapply?:ReapplyPolicy; snapshot?:boolean; meta:DataMeta; }
export interface MindscapeDefinition { level:1|2|3|4|5|6; name:string; description:string; effects:EffectDefinition[]; skillLevelBonuses?:Partial<Record<SkillType,number>>; meta:DataMeta; }
export interface AgentDefinition { id:string; name:string; rarity:'S'|'A'; attribute:Attribute; specialty:Specialty; faction:string; maxLevel:number; baseStats:CombatStats; skills:SkillDefinition[]; coreEffects:EffectDefinition[]; additionalAbility?:EffectDefinition; mindscapes:MindscapeDefinition[]; meta:DataMeta; }
export interface WEngineDefinition { id:string; name:string; rarity:'S'|'A'|'B'; specialty:Specialty; level:number; baseAtk:number; advancedStat:{stat:StatKey;value:number}; refinementValues?:number[]; effects:EffectDefinition[]; meta:DataMeta; }
export interface DriveDiscDefinition { id:string; name:string; twoPiece:EffectDefinition[]; fourPiece:EffectDefinition[]; meta:DataMeta; }
export interface DriveDiscSelection { setId:string; pieces:number; }
export interface BuildConfig { id:string; name:string; agentId:string; level:number; mindscape:number; skillLevels:Partial<Record<SkillType,number>>; wengineId?:string; wengineLevel:number; refinement:number; driveDiscs:DriveDiscSelection[]; mainStats:Partial<CombatStats>; substats:Partial<CombatStats>; manualFinalStats?:CombatStats; useManualFinalStats:boolean; }
export interface TeamConfig { id:string; name:string; builds:BuildConfig[]; }
export interface RuntimeCharacterState { id:string; energy:number; isActive:boolean; fieldTime:number; }
export interface ActiveEffect { key:string; definition:EffectDefinition; sourceCharacterId:string; startedAt:number; expiresAt?:number; stacks:number; lastTriggeredAt:number; snapshotStats?:CombatStats; }
export interface CombatState { currentTime:number; activeCharacterId:string; team:AgentDefinition[]; characterStates:Record<string,RuntimeCharacterState>; enemy:EnemyState; activeEffects:ActiveEffect[]; lastAction?:{agentId:string;skillType:SkillType;skillId?:string;at:number}; triggerTimes:Partial<Record<Trigger,number>>; effectTriggerTimes:Record<string,number>; anomaly:AnomalyState; }
export interface EffectContext { state:CombatState; sourceAgentId:string; targetAgentId?:string; }
export interface DamageBreakdown { baseDamage:number; skillMultiplier:number; dmgBonusMultiplier:number; critMultiplier:number; defMultiplier:number; resMultiplier:number; vulnerabilityMultiplier:number; stunMultiplier:number; specialMultiplier:number; nonCrit:number; crit:number; expected:number; }
export interface RotationAction { id:string; agentId:string; skillId?:string; type:'skill'|'switch'|'wait'; durationOverride?:number; }
export interface RotationConfig { id:string; name:string; actions:RotationAction[]; }
export interface TimelineEntry { time:number; kind:'action'|'hit'|'effect'|'expire'|'anomaly'|'switch'; label:string; agentId?:string; skillId?:string; damage:number; }
export interface RotationResult { duration:number; totalDamage:number; dps:number; timeline:TimelineEntry[]; damageByCharacter:Record<string,number>; damageBySkill:Record<string,number>; buffUptime:Record<string,number>; fieldTime:Record<string,number>; critContribution:number; anomalyContribution:number; }
export interface AnomalyDefinition { attribute:Attribute; threshold:number; baseMultiplier:number; duration:number; tickInterval?:number; disorderBaseMultiplier?:number; meta:DataMeta; }
export interface AnomalyContribution { agentId:string; buildup:number; ap:number; atk:number; }
export interface ActiveAnomaly { attribute:Attribute; appliedAt:number; expiresAt:number; contributions:AnomalyContribution[]; }
export interface AnomalyState { buildup:Partial<Record<Attribute,number>>; contributions:Partial<Record<Attribute,AnomalyContribution[]>>; active?:ActiveAnomaly; }
