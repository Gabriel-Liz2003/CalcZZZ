import type { AnomalyDefinition } from '../engine/types';
import { GAME_DATA_VERSION, LAST_VERIFIED } from './meta';

const source = 'https://zenless-zone-zero.fandom.com/wiki/Attribute_Anomaly';
const meta = { gameVersion: GAME_DATA_VERSION, source, lastVerified: LAST_VERIFIED, verified: true, notes: 'Coeficientes, duração e cadência verificados; threshold é fallback de inimigo comum e pode ser sobrescrito pelo preset.' } as const;

export const anomalyDefinitions: AnomalyDefinition[] = [
  // Common-enemy fallback thresholds: 600, Physical 720. Elite/Boss presets override these.
  { attribute: 'Physical', threshold: 720, baseMultiplier: 7.13, duration: 10, disorderBaseMultiplier: 4.5, meta },
  { attribute: 'Fire', threshold: 600, baseMultiplier: 0, duration: 10, tickInterval: 0.5, tickMultiplier: 0.5, maxTicks: 20, disorderBaseMultiplier: 4.5, meta },
  { attribute: 'Electric', threshold: 600, baseMultiplier: 0, duration: 10, tickInterval: 1, tickMultiplier: 1.25, maxTicks: 10, reactiveTicks: true, disorderBaseMultiplier: 4.5, meta },
  { attribute: 'Ether', threshold: 600, baseMultiplier: 0, duration: 10, tickInterval: 0.5, tickMultiplier: 0.625, maxTicks: 20, reactiveTicks: true, disorderBaseMultiplier: 4.5, meta },
  { attribute: 'Ice', threshold: 600, baseMultiplier: 5, duration: 10, disorderBaseMultiplier: 4.5, meta },
];
