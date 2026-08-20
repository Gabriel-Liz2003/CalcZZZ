import { openChainWindow } from './combat';
import type { CombatState, SkillDefinition, TimelineEntry } from './types';

export interface AgentHandlerContext { state:CombatState; agentId:string; skill?:SkillDefinition; mindscape:number; teamMindscapes?:Record<string,number>; }
export interface AftertoneResult { state:CombatState; triggered:boolean; }

export function initialResources(agentId:string):Record<string,number>{
  if(agentId==='dialyn')return{positiveReviews:60,customerComplaints:0,exStage:0,exStageExpiresAt:0,upgradedUltimatePending:0,aftertoneTargetSlot:0,aftertoneRemaining:0,aftertoneReadyAt:0};
  return{};
}

export function advanceUniqueResources(state:CombatState,seconds:number,mindscapes:Record<string,number>):{state:CombatState;events:TimelineEntry[]}{
  if(seconds<=0)return{state,events:[]}; let next=state; const dialyn=next.characterStates.dialyn;
  if(dialyn){const resources={...(dialyn.resources??initialResources('dialyn'))};const before=resources.positiveReviews??60;const rate=.6*((mindscapes.dialyn??0)>=1?1.16:1);const after=Math.min(120,before+rate*seconds);resources.positiveReviews=after;if(before<90&&after>=90)resources.customerComplaints=1;if((resources.exStageExpiresAt??0)>0&&next.currentTime+seconds>(resources.exStageExpiresAt??0)){resources.exStage=0;resources.exStageExpiresAt=0;}next={...next,characterStates:{...next.characterStates,dialyn:{...dialyn,resources}}};}
  return{state:next,events:[]};
}

export function validateUniqueSkill(context:AgentHandlerContext):string|undefined{
  const{state,agentId,skill}=context;if(!skill)return undefined;
  if(agentId==='dialyn'){const r=state.characterStates.dialyn?.resources??initialResources('dialyn');const stage=r.exStage??0;const validUntil=r.exStageExpiresAt??0;if(skill.id==='ex-scissors'&&!(stage===1&&state.currentTime<=validUntil))return'EX Special: Scissors requer EX Special: Rock nos últimos 8s.';if(skill.id==='ex-paper'&&!(stage===2&&state.currentTime<=validUntil))return'EX Special: Paper! requer EX Special: Scissors nos últimos 8s.';if(skill.id==='ex-get-lost'&&(r.customerComplaints??0)<1)return'EX Special: Get Lost! requer 1 Customer Complaint.';}
  return undefined;
}

export function beforeUniqueSkill(context:AgentHandlerContext):{state:CombatState;events:TimelineEntry[]}{
  let{state}=context;const events:TimelineEntry[]=[];const skill=context.skill;if(!skill)return{state,events};const dialyn=state.characterStates.dialyn;
  if(context.agentId!=='dialyn'&&skill.type==='Ultimate'&&dialyn){const resources={...(dialyn.resources??initialResources('dialyn'))};if((resources.upgradedUltimatePending??0)>0){const before=resources.positiveReviews??0;resources.positiveReviews=Math.max(0,before-60);resources.upgradedUltimatePending=0;if((context.teamMindscapes?.dialyn??0)>=6){const slot=Math.max(0,state.team.findIndex((a)=>a.id===context.agentId));resources.aftertoneTargetSlot=slot+1;resources.aftertoneRemaining=12;resources.aftertoneReadyAt=state.currentTime;}state={...state,characterStates:{...state.characterStates,dialyn:{...dialyn,resources}}};events.push({time:state.currentTime,kind:'resource',label:`Dialyn: Ultimate convertido consumiu 60 Positive Reviews (${before.toFixed(1)} → ${resources.positiveReviews.toFixed(1)})`,agentId:'dialyn',damage:0});}}
  if(context.agentId!=='dialyn')return{state,events};const runtime=state.characterStates.dialyn;if(!runtime)return{state,events};const resources={...(runtime.resources??initialResources('dialyn'))};
  if(skill.id==='ex-get-lost'){resources.customerComplaints=Math.max(0,(resources.customerComplaints??0)-1);const reviews=resources.positiveReviews??0;if(state.chainWindowOpen&&reviews>=90){resources.upgradedUltimatePending=1;}else if(!state.chainWindowOpen&&reviews>=90){resources.positiveReviews=Math.max(0,reviews-90);resources.upgradedUltimatePending=1;state=openChainWindow(state);events.push({time:state.currentTime,kind:'resource',label:'Dialyn consumiu 90 Positive Reviews e forçou Chain Attack window',agentId:'dialyn',damage:0});}}
  if(skill.type==='Chain'&&(resources.positiveReviews??0)>=90)resources.upgradedUltimatePending=1;
  state={...state,characterStates:{...state.characterStates,dialyn:{...runtime,resources}}};return{state,events};
}

export function afterUniqueSkillHit(context:AgentHandlerContext):{state:CombatState;events:TimelineEntry[]}{
  let{state}=context;const events:TimelineEntry[]=[];const skill=context.skill;if(context.agentId!=='dialyn'||!skill)return{state,events};const runtime=state.characterStates.dialyn;if(!runtime)return{state,events};const resources={...(runtime.resources??initialResources('dialyn'))};
  if(['ex-rock','ex-scissors','ex-paper'].includes(skill.id)){const gain=7.5*(context.mindscape>=1?1.16:1);const before=resources.positiveReviews??60;const after=Math.min(120,before+gain);resources.positiveReviews=after;if(before<90&&after>=90)resources.customerComplaints=1;if(skill.id==='ex-rock'){resources.exStage=1;resources.exStageExpiresAt=state.currentTime+8;}if(skill.id==='ex-scissors'){resources.exStage=2;resources.exStageExpiresAt=state.currentTime+8;}if(skill.id==='ex-paper'){resources.exStage=0;resources.exStageExpiresAt=0;if(!state.enemy.debuffs.includes('malicious-complaint'))state={...state,enemy:{...state.enemy,debuffs:[...state.enemy.debuffs,'malicious-complaint']}};}events.push({time:state.currentTime,kind:'resource',label:`Dialyn Positive Reviews: ${before.toFixed(1)} → ${after.toFixed(1)}`,agentId:'dialyn',damage:0});}
  if(skill.type==='Ultimate')resources.customerComplaints=1;state={...state,characterStates:{...state.characterStates,dialyn:{...runtime,resources}}};return{state,events};
}

export function tryAftertone(state:CombatState,attackerId:string):AftertoneResult{
  const dialyn=state.characterStates.dialyn;if(!dialyn)return{state,triggered:false};const r={...(dialyn.resources??initialResources('dialyn'))};const slot=state.team.findIndex((a)=>a.id===attackerId)+1;if(slot<=0||slot!==(r.aftertoneTargetSlot??0)||(r.aftertoneRemaining??0)<=0||state.currentTime+1e-9<(r.aftertoneReadyAt??0))return{state,triggered:false};r.aftertoneRemaining=Math.max(0,(r.aftertoneRemaining??0)-1);r.aftertoneReadyAt=state.currentTime+1;return{state:{...state,characterStates:{...state.characterStates,dialyn:{...dialyn,resources:r}}},triggered:true};
}

export function onStunStartedUnique(state:CombatState,mindscapes:Record<string,number>):{state:CombatState;events:TimelineEntry[]}{const events:TimelineEntry[]=[];if(!state.enemy.debuffs.includes('malicious-complaint'))return{state,events};const enemy={...state.enemy,stunDuration:(state.enemy.stunDuration??10)+2};events.push({time:state.currentTime,kind:'stun',label:'Malicious Complaint: Stun duration +2s',agentId:'dialyn',damage:0});if((mindscapes.dialyn??0)>=2)events.push({time:state.currentTime,kind:'effect',label:'Dialyn M2: Malicious Complaint enhanced',agentId:'dialyn',damage:0});return{state:{...state,enemy},events};}
export function afterStunExpiredUnique(state:CombatState):CombatState{return state.enemy.debuffs.includes('malicious-complaint')?{...state,enemy:{...state.enemy,debuffs:state.enemy.debuffs.filter((x)=>x!=='malicious-complaint')}}:state;}

export function applyUniqueSkillStats(state:CombatState,agentId:string,skill:SkillDefinition,stats:{critDmg:number;impact:number}):{critDmg:number;impact:number}{if(agentId!=='dialyn')return stats;const next={...stats};const required=state.team.some((a)=>a.id!=='dialyn'&&(a.specialty==='Attack'||a.specialty==='Rupture'));if(required&&skill.type==='EX Special')next.critDmg+=.5;const staticCrit=state.characterStates.dialyn?.staticStats?.critRate??.05;if(staticCrit>.5)next.impact+=Math.min(100,(staticCrit-.5)*100*2);return next;}
