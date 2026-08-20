import type { AnomalyDefinition } from '../engine/types';
import { GAME_DATA_VERSION, LAST_VERIFIED } from './meta';

const meta = { gameVersion: GAME_DATA_VERSION, source: 'Community anomaly formula reference pending live re-verification', lastVerified: LAST_VERIFIED, verified: false, notes: 'Motor funcional; coeficientes abaixo são fixtures conservadoras e a UI marca como não verificados.' } as const;
export const anomalyDefinitions: AnomalyDefinition[] = [
  { attribute: 'Physical', threshold: 100, baseMultiplier: 7.13, duration: 0, disorderBaseMultiplier: 4.5, meta },
  { attribute: 'Fire', threshold: 100, baseMultiplier: 10, duration: 10, tickInterval: 0.5, disorderBaseMultiplier: 4.5, meta },
  { attribute: 'Electric', threshold: 100, baseMultiplier: 12.5, duration: 10, tickInterval: 1, disorderBaseMultiplier: 4.5, meta },
  { attribute: 'Ether', threshold: 100, baseMultiplier: 12.5, duration: 10, tickInterval: 0.5, disorderBaseMultiplier: 4.5, meta },
  { attribute: 'Ice', threshold: 100, baseMultiplier: 5, duration: 3, disorderBaseMultiplier: 4.5, meta },
];
