#!/usr/bin/env node
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const DEFAULT_ZSIM = 'https://raw.githubusercontent.com/ZSim-Dev/ZSim/e248e9f149a6b889290579d8e673e132be9bde31/zsim/data/skill.csv';
const [, , agentsArg, enginesArg, discsArg, zsimArg] = process.argv;
if (!agentsArg || !enginesArg || !discsArg) {
  console.error('Usage: npm run update-data -- <agents.json> <wengines.json> <drive-discs.json> [zsim-skill.csv|--online]');
  process.exit(2);
}

const readJson = async (path) => JSON.parse(await readFile(resolve(path), 'utf8'));
const agentsRaw = await readJson(agentsArg);
const enginesRaw = await readJson(enginesArg);
const discsRaw = await readJson(discsArg);

const agents = agentsRaw.agents ?? {};
const wengines = enginesRaw.wengines ?? {};
const driveDiscs = discsRaw.sets ?? {};
if (!Object.keys(agents).length) throw new Error('Agents dataset is empty.');
if (!Object.keys(wengines).length) throw new Error('W-Engines dataset is empty.');
if (!Object.keys(driveDiscs).length) throw new Error('Drive Disc dataset is empty.');

let zsimText = '';
if (zsimArg === '--online') {
  const response = await fetch(DEFAULT_ZSIM);
  if (!response.ok) throw new Error(`ZSim download failed: HTTP ${response.status}`);
  zsimText = await response.text();
} else if (zsimArg) {
  zsimText = await readFile(resolve(zsimArg), 'utf8');
}

const timingRows = zsimText ? parseCsv(zsimText) : [];
const rowsByCid = new Map();
for (const row of timingRows) {
  if (!(Number(row.ticks) > 0)) continue;
  const key = String(row.CID ?? '');
  const list = rowsByCid.get(key) ?? [];
  list.push(row);
  rowsByCid.set(key, list);
}

let skillCount = 0;
let measured = 0;
let estimated = 0;
for (const agent of Object.values(agents)) {
  const zRows = rowsByCid.get(String(agent.gameId ?? '')) ?? [];
  for (const skill of Object.values(agent.skills ?? {})) {
    skillCount += 1;
    const matched = matchZSim(skill, zRows);
    if (matched) {
      skill.duration = matched.duration;
      skill.hitTimings = matched.hitTimings;
      skill.timingMeta = matched.meta;
      measured += 1;
    } else {
      const fallback = estimatedTiming(skill);
      skill.duration = fallback.duration;
      skill.hitTimings = fallback.hitTimings;
      skill.timingMeta = fallback.meta;
      estimated += 1;
    }
  }
}

const output = {
  meta: {
    schemaVersion: 2,
    gameVersion: agentsRaw.meta?.gameVersion ?? '3.1',
    generatedAt: new Date().toISOString(),
    sourceFiles: { agents: agentsArg, wengines: enginesArg, driveDiscs: discsArg },
    timingSource: zsimText ? DEFAULT_ZSIM : null,
    timingCoverage: { total: skillCount, measured, estimated },
  },
  agents,
  wengines,
  driveDiscs,
  statSystem: discsRaw.statSystem ?? {},
  sources: {
    agents: agentsRaw.meta?.sources ?? {},
    wengines: enginesRaw.meta?.sources ?? {},
    driveDiscs: discsRaw.meta?.sources ?? {},
  },
};

validateOutput(output);
const outPath = resolve('public/data/calczzz-game-data-v3.1.json');
await mkdir(dirname(outPath), { recursive: true });
await writeFile(outPath, JSON.stringify(output, null, 2), 'utf8');
console.log(`Generated ${outPath}`);
console.log(`Agents: ${Object.keys(agents).length}; W-Engines: ${Object.keys(wengines).length}; Drive Discs: ${Object.keys(driveDiscs).length}`);
console.log(`Skills: ${skillCount}; measured timings: ${measured}; estimated timings: ${estimated}`);

function validateOutput(data) {
  const issues = [];
  for (const [agentId, agent] of Object.entries(data.agents)) {
    if (!agent.name) issues.push(`${agentId}: missing name`);
    for (const [skillId, skill] of Object.entries(agent.skills ?? {})) {
      if (!(Number(skill.duration) > 0)) issues.push(`${agentId}/${skillId}: invalid duration`);
      if (!Array.isArray(skill.hitTimings)) issues.push(`${agentId}/${skillId}: missing hitTimings`);
      if ((skill.hits?.length ?? 0) !== skill.hitTimings.length && (skill.hits?.length ?? 0) > 0) issues.push(`${agentId}/${skillId}: hit timing count mismatch`);
      if (!skill.timingMeta?.source) issues.push(`${agentId}/${skillId}: missing timing source`);
    }
  }
  if (issues.length) throw new Error(`Generated data validation failed:\n${issues.slice(0, 30).join('\n')}${issues.length > 30 ? `\n... ${issues.length - 30} more` : ''}`);
}

const CATEGORY_SECONDS = { Dodge:.42,'Defensive Assist':.5,'Evasive Assist':.55,'Dash Attack':.68,'Dodge Counter':1.2,Special:.9,'EX Special':1.45,Chain:1.9,Ultimate:2.65,'Quick Assist':1.1,'Assist Follow-Up':1.35,Assist:.85,Basic:.68 };
const ZSIM_CATEGORY = { '普攻':'Basic','特殊技':'Special','强化特殊技':'EX Special','冲刺攻击':'Dash Attack','闪避反击':'Dodge Counter','连携技':'Chain','终结技':'Ultimate','快速支援':'Quick Assist','受击支援':'Quick Assist','支援突击':'Assist Follow-Up','突击支援':'Assist Follow-Up','招架/回避支援':'Defensive Assist' };
function estimatedTiming(skill) {
  const category = skill.category ?? 'Special';
  const hitCount = Math.max(1, skill.hits?.length ?? 0);
  const base = CATEGORY_SECONDS[category] ?? 1;
  let duration = base;
  if (category === 'Basic') duration = Math.min(5, Math.max(base, base * hitCount * .92));
  else if (['EX Special','Special','Assist Follow-Up','Quick Assist','Dodge Counter'].includes(category)) duration = Math.min(base + .14 * Math.max(0, hitCount - 1), base * 1.75);
  const count = skill.hits?.length ?? 0;
  const start = Math.min(.18, duration * .2), end = Math.max(start, duration * .88);
  const hitTimings = Array.from({length:count}, (_,i)=>round4(start+(end-start)*(count<=1?.65:i/(count-1))));
  return { duration:round4(duration), hitTimings, meta:{source:'CalcZZZ category timing model v1',confidence:'estimated',verified:false,note:'Fallback only; replace with measured frame data when available.'} };
}
function matchZSim(skill, rows) {
  const values=(skill.hits??[]).map(h=>Number(h.damageMultiplier?.['12']??0)).filter(v=>v>0);
  if (!values.length) return null;
  const candidates=rows.filter(r=>!ZSIM_CATEGORY[r.CN_TriggerLevel]||ZSIM_CATEGORY[r.CN_TriggerLevel]===skill.category).map(row=>{const d=Number(row.D_LEVEL12??0);return {row,error:Math.min(...values.map(v=>Math.abs(v-d)/Math.max(.01,v)))}}).sort((a,b)=>a.error-b.error);
  const best=candidates[0]; if(!best||best.error>.14)return null;
  const duration=Number(best.row.ticks)/60, count=skill.hits?.length??0;
  let list=[]; try{list=JSON.parse(String(best.row.tick_list||'').replace(/'/g,'"'));}catch{}
  const hitTimings=Array.isArray(list)&&list.length===count?list.map(t=>round4(Number(t)/60)):Array.from({length:count},(_,i)=>round4(duration*(count<=1?.65:.15+.72*i/(count-1))));
  return {duration:round4(duration),hitTimings,meta:{source:`ZSim ${best.row.skill_tag??''} @ e248e9f149a6b889290579d8e673e132be9bde31`,confidence:'zsim',verified:true,matchError:round4(best.error)}};
}
function parseCsv(text) {
  const rows=[];let row=[],current='',quoted=false;
  for(let i=0;i<text.length;i+=1){const c=text[i];if(quoted){if(c==='"'&&text[i+1]==='"'){current+='"';i+=1}else if(c==='"')quoted=false;else current+=c}else if(c==='"')quoted=true;else if(c===','){row.push(current);current=''}else if(c==='\n'){row.push(current.replace(/\r$/,''));rows.push(row);row=[];current=''}else current+=c}if(current||row.length){row.push(current);rows.push(row)}
  const header=(rows.shift()??[]).map(v=>v.replace(/^\ufeff/,''));return rows.map(values=>Object.fromEntries(header.map((key,index)=>[key,values[index]??''])));
}
function round4(v){return Math.round(v*10000)/10000;}
