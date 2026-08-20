import { z } from 'zod';

export const schemaVersion = 1;
export type PresetType = 'build' | 'team' | 'rotation' | 'enemy';
export interface PresetEnvelope<T = unknown> { schemaVersion: number; gameVersion: string; type: PresetType; name: string; id: string; data: T }

const envelopeSchema = z.object({
  schemaVersion: z.number().int().positive(),
  gameVersion: z.string().min(1),
  type: z.enum(['build', 'team', 'rotation', 'enemy']),
  name: z.string().min(1),
  id: z.string().min(1),
  data: z.unknown(),
});

const KEY = 'calczzz-presets-v1';

export function loadPresets(): PresetEnvelope[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item) => {
      const result = envelopeSchema.safeParse(item);
      return result.success ? [result.data as PresetEnvelope] : [];
    });
  } catch { return []; }
}

export function savePreset<T>(preset: PresetEnvelope<T>): PresetEnvelope[] {
  const parsed = envelopeSchema.parse(preset) as PresetEnvelope;
  const all = loadPresets().filter((item) => item.id !== parsed.id);
  const next = [...all, parsed];
  if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function deletePreset(id: string): PresetEnvelope[] {
  const next = loadPresets().filter((item) => item.id !== id);
  if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function renamePreset(id: string, name: string): PresetEnvelope[] {
  const next = loadPresets().map((item) => item.id === id ? { ...item, name } : item);
  if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function duplicatePreset(id: string): PresetEnvelope[] {
  const all = loadPresets();
  const original = all.find((item) => item.id === id);
  if (!original) return all;
  const copy = { ...original, id: crypto.randomUUID(), name: `${original.name} (cópia)` };
  const next = [...all, copy];
  if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function exportPreset(preset: PresetEnvelope): string { return JSON.stringify(preset, null, 2); }
export function importPreset(json: string): PresetEnvelope {
  const parsed = envelopeSchema.parse(JSON.parse(json));
  if (parsed.schemaVersion !== schemaVersion) throw new Error(`schemaVersion não suportado: ${parsed.schemaVersion}`);
  return parsed as PresetEnvelope;
}
