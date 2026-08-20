export interface TimingMeta {
  source: string;
  confidence: 'zsim' | 'measured' | 'estimated';
  verified: boolean;
  matchError?: number;
  note?: string;
}

export interface TimingSkillLike {
  id: string;
  category?: string;
  duration?: number | null;
  hitTimings?: number[] | null;
  hits?: Array<{ damageMultiplier?: Record<string, number>; dazeMultiplier?: Record<string, number> }>;
}

export interface TimingAgentLike {
  id: string;
  gameId?: string | number;
  skills: Record<string, TimingSkillLike>;
}

export interface EnrichedTiming {
  duration: number;
  hitTimings: number[];
  meta: TimingMeta;
}

const CATEGORY_SECONDS: Record<string, number> = {
  Dodge: 0.42,
  'Defensive Assist': 0.5,
  'Evasive Assist': 0.55,
  'Dash Attack': 0.68,
  'Dodge Counter': 1.2,
  Special: 0.9,
  'EX Special': 1.45,
  Chain: 1.9,
  Ultimate: 2.65,
  'Quick Assist': 1.1,
  'Assist Follow-Up': 1.35,
  Assist: 0.85,
  Basic: 0.68,
};

const ZSIM_CATEGORY: Record<string, string> = {
  '普攻': 'Basic',
  '特殊技': 'Special',
  '强化特殊技': 'EX Special',
  '冲刺攻击': 'Dash Attack',
  '闪避反击': 'Dodge Counter',
  '连携技': 'Chain',
  '终结技': 'Ultimate',
  '快速支援': 'Quick Assist',
  '受击支援': 'Quick Assist',
  '支援突击': 'Assist Follow-Up',
  '突击支援': 'Assist Follow-Up',
  '招架/回避支援': 'Defensive Assist',
};

/**
 * Deterministic fallback used only where no measured timing source exists.
 * The result is explicitly marked estimated and must never be presented as frame data.
 */
export function estimatedTiming(skill: TimingSkillLike): EnrichedTiming {
  const category = skill.category ?? 'Special';
  const hitCount = Math.max(1, skill.hits?.length ?? 0);
  const base = CATEGORY_SECONDS[category] ?? 1;
  let duration = base;
  if (category === 'Basic') duration = Math.min(5, Math.max(base, base * hitCount * 0.92));
  else if (['EX Special', 'Special', 'Assist Follow-Up', 'Quick Assist', 'Dodge Counter'].includes(category)) {
    duration = Math.min(base + 0.14 * Math.max(0, hitCount - 1), base * 1.75);
  }
  const count = skill.hits?.length ?? 0;
  const start = Math.min(0.18, duration * 0.2);
  const end = Math.max(start, duration * 0.88);
  const hitTimings = Array.from({ length: count }, (_, index) => {
    const position = count <= 1 ? 0.65 : index / (count - 1);
    return round4(start + (end - start) * position);
  });
  return {
    duration: round4(duration),
    hitTimings,
    meta: {
      source: 'CalcZZZ category timing model v1',
      confidence: 'estimated',
      verified: false,
      note: 'Fallback only; replace with a measured source when available.',
    },
  };
}

export interface ZSimRow {
  CID?: string;
  CN_TriggerLevel?: string;
  skill_tag?: string;
  D_LEVEL12?: string;
  ticks?: string;
  tick_list?: string;
}

/** Minimal RFC4180-style parser sufficient for ZSim skill.csv, including quoted tick_list fields. */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let current = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { current += '"'; i += 1; }
      else if (char === '"') quoted = false;
      else current += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') { row.push(current); current = ''; }
    else if (char === '\n') { row.push(current.replace(/\r$/, '')); rows.push(row); row = []; current = ''; }
    else current += char;
  }
  if (current || row.length) { row.push(current); rows.push(row); }
  const header = (rows.shift() ?? []).map((value) => value.replace(/^\ufeff/, ''));
  return rows.map((values) => Object.fromEntries(header.map((key, index) => [key, values[index] ?? ''])));
}

export function enrichAgentTimingsFromZSim(agent: TimingAgentLike, csvText: string): Record<string, EnrichedTiming> {
  const rows = parseCsv(csvText).filter((row) => String(row.CID ?? '') === String(agent.gameId ?? '') && Number(row.ticks) > 0) as ZSimRow[];
  const output: Record<string, EnrichedTiming> = {};
  for (const skill of Object.values(agent.skills)) {
    const level12 = (skill.hits ?? []).map((hit) => Number(hit.damageMultiplier?.['12'] ?? 0)).filter((value) => value > 0);
    if (!level12.length) continue;
    const candidates = rows
      .filter((row) => !ZSIM_CATEGORY[row.CN_TriggerLevel ?? ''] || ZSIM_CATEGORY[row.CN_TriggerLevel ?? ''] === skill.category)
      .map((row) => {
        const damage = Number(row.D_LEVEL12 ?? 0);
        const error = Math.min(...level12.map((value) => Math.abs(value - damage) / Math.max(0.01, value)));
        return { row, error };
      })
      .sort((a, b) => a.error - b.error);
    const best = candidates[0];
    if (!best || best.error > 0.14) continue;
    const duration = Number(best.row.ticks) / 60;
    let tickList: number[] = [];
    try { tickList = JSON.parse(String(best.row.tick_list || '').replace(/'/g, '"')) as number[]; } catch { tickList = []; }
    const count = skill.hits?.length ?? 0;
    const hitTimings = tickList.length === count
      ? tickList.map((tick) => round4(tick / 60))
      : Array.from({ length: count }, (_, index) => round4(duration * (count <= 1 ? 0.65 : 0.15 + (0.72 * index) / (count - 1))));
    output[skill.id] = {
      duration: round4(duration),
      hitTimings,
      meta: {
        source: `ZSim ${best.row.skill_tag ?? ''} @ e248e9f149a6b889290579d8e673e132be9bde31`,
        confidence: 'zsim',
        verified: true,
        matchError: round4(best.error),
      },
    };
  }
  return output;
}

function round4(value: number): number { return Math.round(value * 10000) / 10000; }
